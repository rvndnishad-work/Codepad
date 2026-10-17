/**
 * DSA ULTRA — batch 33: math and bit manipulation (bit tricks, popcount,
 * single number via XOR, GCD, Sieve of Eratosthenes). One complete answer per
 * language (Python, JavaScript, Java, C++). Every example was run with
 * python3 / node / javac+java / g++ -std=c++17 by
 * scripts/verify-dsa-examples.ts and the quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  {
    title: `What are the most useful bit manipulation tricks for interviews?`,
    difficulty: "medium",
    seoDescription: `The bit tricks interviews use: test, set, clear and toggle bits, x & (x-1), x & -x, XOR and bitmask subsets, in Python, JavaScript, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Walk me through the bit manipulation tricks you would actually use in a coding interview. For each, tell me the expression, why it works, and anything about Python integers that changes how you write it."

**What a strong answer should cover:**
- The single-bit operations with a mask: test \`(x >> i) & 1\`, set \`x | (1 << i)\`, clear \`x & ~(1 << i)\`, toggle \`x ^ (1 << i)\`.
- The lowest-set-bit pair: \`x & (x - 1)\` clears it, \`x & -x\` isolates it; the power-of-two test with the \`x > 0\` guard.
- XOR properties (\`a ^ a == 0\`, \`a ^ 0 == a\`) and their uses: single number, missing number, Hamming distance.
- Bitmasks as sets: enumerate subsets with \`range(1 << n)\`, submasks with \`sub = (sub - 1) & mask\`, and the 3^n total.
- Python details: ints are unbounded (no overflow, no \`>>>\`), negatives act like infinite leading 1s so you mask with \`& 0xFFFFFFFF\` to emulate 32 bits, \`int.bit_count()\` (3.10+) and \`int.bit_length()\`, and \`&\` binds tighter than \`==\` in Python (unlike C-family languages).

**Code / implementation expected:** Optional — short Python expressions for each trick, ideally with a small demo on one number.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who are comfortable with loops and integers in Python; binary is explained from scratch.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture the light-switch panel in a small office: eight switches in a row, each controlling one room. To answer "is the kitchen light on?" you look at one switch. To turn the meeting room on without touching anything else, you flip only that switch. To ask "how many rooms are lit?" you count the switches that are up.

An integer inside a computer is exactly such a panel. A 32-bit integer is a row of 32 switches (bits), and the processor can read, set, clear or flip *all of them at once* in a single instruction. Bit manipulation is the habit of treating a number as that row of switches instead of as a quantity.

Interviewers ask about it for three reasons. Some problems become one-liners with the right trick ([single number](/interview-question/how-do-you-find-the-single-number-where-every-other-element-appears-twice), power of two, [counting set bits](/interview-question/how-do-you-count-the-number-of-set-bits-in-an-integer)). A small set stored as bits makes some algorithms fast and compact ([bitmask dynamic programming](/interview-question/what-is-bitmask-dynamic-programming), [generating all subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array)). And the details — negative numbers, shift limits, operator precedence — differ between languages, which reveals whether a candidate really knows the language they are coding in.

This page is a toolkit: about a dozen tricks, why each one works, and the traps in your language.

## 2. Binary in Two Minutes

Each bit position stands for a power of two. Position 0 (the rightmost) is worth 1, position 1 is worth 2, position 2 is worth 4, and so on. The number 44 is 32 + 8 + 4, so bits 5, 3 and 2 are on:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 190" role="img" aria-label="The number 44 as eight bits 00101100, with bit positions 7 to 0 and place values 128 to 1; bits 5, 3 and 2 are set">
  <text class="d-sub" x="75" y="30" text-anchor="middle">bit 7</text>
  <text class="d-sub" x="155" y="30" text-anchor="middle">bit 6</text>
  <text class="d-sub" x="235" y="30" text-anchor="middle">bit 5</text>
  <text class="d-sub" x="315" y="30" text-anchor="middle">bit 4</text>
  <text class="d-sub" x="395" y="30" text-anchor="middle">bit 3</text>
  <text class="d-sub" x="475" y="30" text-anchor="middle">bit 2</text>
  <text class="d-sub" x="555" y="30" text-anchor="middle">bit 1</text>
  <text class="d-sub" x="635" y="30" text-anchor="middle">bit 0</text>
  <rect class="d-box-muted" x="45" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="75" y="86" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="125" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="155" y="86" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="205" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="235" y="86" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="285" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="315" y="86" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="365" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="395" y="86" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="445" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="475" y="86" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="525" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="555" y="86" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="605" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="635" y="86" text-anchor="middle">0</text>
  <text class="d-sub" x="75" y="145" text-anchor="middle">128</text>
  <text class="d-sub" x="155" y="145" text-anchor="middle">64</text>
  <text class="d-sub" x="235" y="145" text-anchor="middle">32</text>
  <text class="d-sub" x="315" y="145" text-anchor="middle">16</text>
  <text class="d-sub" x="395" y="145" text-anchor="middle">8</text>
  <text class="d-sub" x="475" y="145" text-anchor="middle">4</text>
  <text class="d-sub" x="555" y="145" text-anchor="middle">2</text>
  <text class="d-sub" x="635" y="145" text-anchor="middle">1</text>
</svg>

The highlighted bits add up to 32 + 8 + 4 = 44. We use \`x = 44\` for every trick below, and example 1 prints each result.

📌 **Interview term: Bit / set bit** — a bit is one binary digit, 0 or 1. A *set* bit is a bit that is 1; a *clear* bit is 0. "Bit i" means the bit worth 2^i, counting from 0 on the right.

**Negative numbers** are stored in **two's complement**: to get -x, flip every bit of x and add 1. In 8 bits, 4 is \`00000100\`, so -4 is \`11111011 + 1 = 11111100\`. Two consequences matter for tricks: the leftmost bit is the sign bit (1 means negative), and \`-x == ~x + 1\` always.

📌 **Interview term: Two's complement** — the standard way to store signed integers: -x is ~x + 1. The top bit is the sign bit, and -1 is all ones.

## 3. The Six Operators

| Operator | Name | Rule per bit | Example on 4-bit values |
| :--- | :--- | :--- | :--- |
| \`a & b\` | AND | 1 only if both are 1 | \`1100 & 1010 = 1000\` |
| \`a \\| b\` | OR | 1 if either is 1 | \`1100 \\| 1010 = 1110\` |
| \`a ^ b\` | XOR | 1 if they differ | \`1100 ^ 1010 = 0110\` |
| \`~a\` | NOT | flips every bit | \`~1100 = 0011\` (in 4 bits) |
| \`a << k\` | left shift | moves bits k places left, fills 0s | \`0011 << 2 = 1100\` (times 4) |
| \`a >> k\` | right shift | moves bits k places right | \`1100 >> 2 = 0011\` (divide by 4) |

📌 **Interview term: Mask** — a number built so that its 1 bits mark the positions you care about, such as \`1 << i\` for bit i or \`(1 << k) - 1\` for the lowest k bits. You combine it with \`&\`, \`|\` or \`^\` to read or change just those positions.

## 4. Reading and Changing One Bit

Every single-bit trick has the same two steps: build the mask \`1 << i\`, then combine it with \`x\` using the right operator.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Single bit tricks: build the mask 1 shifted left by i, then AND to test, OR to set, AND with NOT mask to clear, XOR to toggle">
  <defs>
    <marker id="b33q1-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="220" height="56" rx="10"/>
  <text class="d-text" x="360" y="46" text-anchor="middle">mask = 1 &lt;&lt; i</text>
  <text class="d-sub" x="360" y="66" text-anchor="middle">a single 1 at bit i</text>
  <path class="d-edge" d="M 300 78 L 105 158" marker-end="url(#b33q1-a1)"/>
  <path class="d-edge" d="M 340 78 L 275 158" marker-end="url(#b33q1-a1)"/>
  <path class="d-edge" d="M 380 78 L 445 158" marker-end="url(#b33q1-a1)"/>
  <path class="d-edge" d="M 420 78 L 615 158" marker-end="url(#b33q1-a1)"/>
  <rect class="d-box" x="30" y="164" width="150" height="90" rx="10"/>
  <text class="d-text" x="105" y="194" text-anchor="middle">test</text>
  <text class="d-sub" x="105" y="218" text-anchor="middle">x &amp; mask</text>
  <text class="d-sub" x="105" y="240" text-anchor="middle">nonzero if set</text>
  <rect class="d-box" x="200" y="164" width="150" height="90" rx="10"/>
  <text class="d-text" x="275" y="194" text-anchor="middle">set</text>
  <text class="d-sub" x="275" y="218" text-anchor="middle">x | mask</text>
  <text class="d-sub" x="275" y="240" text-anchor="middle">forces a 1</text>
  <rect class="d-box" x="370" y="164" width="150" height="90" rx="10"/>
  <text class="d-text" x="445" y="194" text-anchor="middle">clear</text>
  <text class="d-sub" x="445" y="218" text-anchor="middle">x &amp; ~mask</text>
  <text class="d-sub" x="445" y="240" text-anchor="middle">forces a 0</text>
  <rect class="d-box" x="540" y="164" width="150" height="90" rx="10"/>
  <text class="d-text" x="615" y="194" text-anchor="middle">toggle</text>
  <text class="d-sub" x="615" y="218" text-anchor="middle">x ^ mask</text>
  <text class="d-sub" x="615" y="240" text-anchor="middle">flips it</text>
</svg>

Why each one works: AND with 0 always gives 0 and AND with 1 keeps the bit, so \`x & mask\` keeps only bit i. OR with 1 always gives 1, so \`x | mask\` forces bit i on and leaves the rest (OR with 0 keeps a bit). \`~mask\` is all ones except bit i, so \`x & ~mask\` forces only bit i off. XOR with 1 flips a bit and XOR with 0 keeps it, so \`x ^ mask\` flips only bit i.

| Trick | Expression | x = 44 (00101100) gives |
| :--- | :--- | :--- |
| Is bit i set? | \`(x >> i) & 1\` | bit 3: 1 (true), bit 4: 0 (false) |
| Set bit i | \`x \\| (1 << i)\` | i = 4: 60 (00111100) |
| Clear bit i | \`x & ~(1 << i)\` | i = 2: 40 (00101000) |
| Toggle bit i | \`x ^ (1 << i)\` | i = 0: 45 (00101101) |
| Lowest k bits mask | \`(1 << k) - 1\` | k = 3: 7 (00000111) |
| Keep lowest k bits (x mod 2^k) | \`x & ((1 << k) - 1)\` | k = 3: 4 |
| Is x odd? | \`x & 1\` | 0, so even |
| Multiply / divide by 2^k | \`x << k\`, \`x >> k\` | \`44 >> 2 = 11\` |

📌 **Interview term: Bit shift** — \`x << k\` moves every bit k positions left (multiplies by 2^k while nothing falls off the top); \`x >> k\` moves them right (divides by 2^k, rounding toward negative infinity for an arithmetic shift).

## 5. The Lowest Set Bit Family

Two expressions carry a surprising number of interview answers.

**\`x & (x - 1)\` clears the lowest set bit.** Subtracting 1 turns the lowest 1 into 0 and every 0 below it into 1; the bits above are unchanged. AND-ing with the original keeps the high part and wipes everything from the lowest 1 down.

**\`x & -x\` keeps only the lowest set bit.** In two's complement \`-x = ~x + 1\`: flipping every bit and adding 1 makes the carry stop exactly at the lowest 1 of x, so x and -x agree only at that one position.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="For x equal to 44 binary 101100: x minus 1 is 101011 and x AND x minus 1 is 101000; minus x ends in 0100 and x AND minus x is 000100">
  <text class="d-text" x="40" y="40">x</text>
  <text class="d-text" x="200" y="40">0 0 1 0 1 1 0 0</text>
  <text class="d-sub" x="520" y="40">44</text>
  <text class="d-text" x="40" y="80">x - 1</text>
  <text class="d-text" x="200" y="80">0 0 1 0 1 0 1 1</text>
  <text class="d-sub" x="520" y="80">43</text>
  <rect class="d-box-accent" x="180" y="96" width="300" height="40" rx="8"/>
  <text class="d-text" x="40" y="122">x &amp; (x - 1)</text>
  <text class="d-text" x="200" y="122">0 0 1 0 1 0 0 0</text>
  <text class="d-sub" x="520" y="122">40: lowest 1 cleared</text>
  <text class="d-text" x="40" y="186">-x</text>
  <text class="d-text" x="200" y="186">1 1 0 1 0 1 0 0</text>
  <text class="d-sub" x="520" y="186">-44 in 8 bits</text>
  <rect class="d-box-accent" x="180" y="202" width="300" height="40" rx="8"/>
  <text class="d-text" x="40" y="228">x &amp; -x</text>
  <text class="d-text" x="200" y="228">0 0 0 0 0 1 0 0</text>
  <text class="d-sub" x="520" y="228">4: only the lowest 1</text>
</svg>

What they unlock:

- **Power of two:** a power of two has exactly one set bit, so clearing it leaves 0: \`x > 0 && (x & (x - 1)) == 0\`. The \`x > 0\` guard matters: 0 and negative numbers are not powers of two (example 1 checks 0, 1, 6, 64, 96 and -8).
- **Count set bits:** repeat \`x &= x - 1\` until x is 0, counting steps (Brian Kernighan's method, on [its own page](/interview-question/how-do-you-count-the-number-of-set-bits-in-an-integer)).
- **Split on a differing bit:** \`(a ^ b) & -(a ^ b)\` is a bit where a and b differ, the key step of the "two single numbers" follow-up.
- **Fenwick (binary indexed) trees** move between nodes with \`i += i & -i\` and \`i -= i & -i\`.

📌 **Interview term: Lowest set bit (lowbit)** — \`x & -x\`: the value of the rightmost 1 bit of x. \`x & (x - 1)\` is x with that bit removed.

📌 **Interview term: Power of two test** — \`x > 0 && (x & (x - 1)) == 0\`; true exactly when x has a single set bit.

## 6. XOR Tricks

XOR has three properties worth memorising: \`a ^ a = 0\`, \`a ^ 0 = a\`, and the order of a chain of XORs does not matter.

- **Cancel pairs:** XOR a whole array and every value that appears twice disappears; that is the [single number](/interview-question/how-do-you-find-the-single-number-where-every-other-element-appears-twice) problem, and with indices mixed in, the [missing number](/interview-question/how-do-you-find-the-missing-number-in-0-n) problem.
- **Find differing bits:** \`a ^ b\` has a 1 exactly where a and b differ, so \`popcount(a ^ b)\` is the Hamming distance between them.
- **Swap without a temporary:** \`a ^= b; b ^= a; a ^= b\` swaps two variables. It works (example 1), but it is slower to read, no faster on modern hardware, and if both names refer to the same memory it zeroes the value. Mention it as a curiosity, then use a normal swap.
- **Opposite signs:** \`(a ^ b) < 0\` is true when a and b have different sign bits.

📌 **Interview term: Hamming distance** — the number of bit positions where two integers differ: the popcount of \`a ^ b\`.

## 7. A Bitmask Is a Set

If you have n ≤ 30 or so items, one integer can represent any subset of them: bit i is 1 when item i is in the subset. Set operations become single instructions:

| Set operation | Bitmask expression |
| :--- | :--- |
| Empty set / full set | \`0\` / \`(1 << n) - 1\` |
| Add item i / remove item i | \`S \\| (1 << i)\` / \`S & ~(1 << i)\` |
| Union / intersection | \`A \\| B\` / \`A & B\` |
| Difference A minus B | \`A & ~B\` |
| Is B a subset of A? | \`(B & A) == B\` |
| Size of the set | popcount(S) |

**Enumerate all subsets:** loop \`mask\` from 0 to \`(1 << n) - 1\`; each value is one subset. For n = 3 that is the 8 lines in example 2.

**Enumerate the submasks of one mask:** start at \`sub = mask\` and step with \`sub = (sub - 1) & mask\` until you have processed 0. Subtracting 1 borrows through the clear bits, and \`& mask\` throws away bits outside the mask, so you visit every submask in decreasing order, each exactly once. For \`1011\` that is 8 submasks (2 to the power of its 3 set bits).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Submasks of 1011 in the order the loop visits them: 1011, 1010, 1001, 1000, 0011, 0010, 0001, 0000">
  <defs>
    <marker id="b33q1-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="90" y="58" text-anchor="middle">1011</text>
  <rect class="d-box" x="200" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="260" y="58" text-anchor="middle">1010</text>
  <rect class="d-box" x="370" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="430" y="58" text-anchor="middle">1001</text>
  <rect class="d-box" x="540" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="600" y="58" text-anchor="middle">1000</text>
  <path class="d-edge" d="M 152 52 L 194 52" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge" d="M 322 52 L 364 52" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge" d="M 492 52 L 534 52" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge-dashed" d="M 600 76 L 100 124" marker-end="url(#b33q1-a2)"/>
  <rect class="d-box" x="30" y="130" width="120" height="44" rx="8"/>
  <text class="d-text" x="90" y="158" text-anchor="middle">0011</text>
  <rect class="d-box" x="200" y="130" width="120" height="44" rx="8"/>
  <text class="d-text" x="260" y="158" text-anchor="middle">0010</text>
  <rect class="d-box" x="370" y="130" width="120" height="44" rx="8"/>
  <text class="d-text" x="430" y="158" text-anchor="middle">0001</text>
  <rect class="d-box-muted" x="540" y="130" width="120" height="44" rx="8"/>
  <text class="d-text" x="600" y="158" text-anchor="middle">0000</text>
  <path class="d-edge" d="M 152 152 L 194 152" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge" d="M 322 152 L 364 152" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge" d="M 492 152 L 534 152" marker-end="url(#b33q1-a2)"/>
</svg>

Each arrow is one \`sub = (sub - 1) & mask\` step. Bit 2 of the mask is 0, so it never appears in a submask; from 1000, subtracting 1 gives 0111, and \`& 1011\` turns that into 0011.

**The 3^n fact:** if you loop over every mask of n bits and, inside, over all of its submasks, the total work is 3^n, not 4^n, because each item is independently "not in mask", "in mask but not in sub", or "in both". Example 2 counts 59,049 = 3^10 visits for n = 10, against 4^10 = 1,048,576. This bound is what makes many [bitmask DP](/interview-question/what-is-bitmask-dynamic-programming) solutions fast enough.

📌 **Interview term: Bitmask** — an integer used as a set of up to 32 or 64 small items: bit i set means item i is in the set.

📌 **Interview term: Submask** — a mask whose set bits are a subset of another mask's set bits; \`(sub - 1) & mask\` steps through all of them.

## 8. Python Integers and Bits

Python's \`int\` has no fixed width: it grows as needed and never overflows. That makes most tricks *simpler*, and a few interview answers subtly *different*, because those answers usually assume a 32-bit integer.

- **Negative numbers behave like an infinite row of 1s on the left.** \`~x\` is always \`-x - 1\` (\`~5\` is \`-6\`), and \`-8 >> 1\` is \`-4\` (arithmetic shift). \`bin(-5)\` prints \`'-0b101'\`, a minus sign plus the magnitude, not the two's complement pattern.
- **To get 32-bit behaviour, mask explicitly.** \`x & 0xFFFFFFFF\` gives the unsigned 32-bit pattern; converting back to signed needs one more step. This is the helper example 3 uses:

~~~python
def to_i32(v):
    """Reinterpret the low 32 bits of v as a signed 32-bit int."""
    v &= MASK32
    return v - (1 << 32) if v >= 1 << 31 else v
~~~

- **There is no \`>>>\`.** A logical right shift of a 32-bit value is \`(x & 0xFFFFFFFF) >> k\`.
- **Shifts are never truncated.** \`1 << 35\` is 34359738368 in Python; in Java and JavaScript the shift count would be reduced mod 32 first. Example 3 shows \`1 << (35 & 31)\`, which is 8 in every language.
- **Useful built-ins:** \`x.bit_length()\` (number of bits needed, 6 for 44), \`x.bit_count()\` (number of 1 bits, added in Python 3.10 per the [int docs](https://docs.python.org/3/library/stdtypes.html#int.bit_count); it counts the bits of \`abs(x)\`, so \`(-8).bit_count()\` is 1 in our run), and \`format(x, '08b')\` for zero-padded binary.
- **Precedence is different from C, Java and JavaScript.** In Python, \`&\`, \`|\` and \`^\` bind *tighter* than comparisons, so \`x & 1 == 0\` means \`(x & 1) == 0\` (our run printed \`True\` for \`6 & 1 == 0\`). Shifts bind tighter than \`&\`, and arithmetic binds tighter than shifts: \`1 << n - 1\` is \`1 << (n - 1)\`. Parenthesise anyway; the reader may come from C.
- **\`%\` follows the divisor's sign.** \`-7 % 2\` is \`1\` in Python (it is \`-1\` in Java, JavaScript and C++), so \`x % 2 == 1\` is a valid odd test in Python only. \`x & 1\` works everywhere.

📌 **Interview term: Arbitrary-precision integer** — an integer type with no fixed size, like Python's \`int\`; it cannot overflow, but bitwise tricks that assume 32 bits need an explicit mask.

## 9. The Tricks in Python

~~~python
x = 44                       # 0b101100
(x >> 3) & 1                 # 1: bit 3 is set
x | (1 << 4)                 # 60: set bit 4
x & ~(1 << 2)                # 40: clear bit 2
x ^ (1 << 0)                 # 45: toggle bit 0
x & -x                       # 4: lowest set bit
x & (x - 1)                  # 40: lowest set bit cleared
(1 << 3) - 1                 # 7: mask of the low 3 bits
def is_power_of_two(n):
    return n > 0 and n & (n - 1) == 0
~~~

Note that \`n & (n - 1) == 0\` needs no parentheses *in Python* because \`&\` binds tighter than \`==\`; in the other three languages it would be a bug.

Bitmask subsets in Python read naturally with a list comprehension:

~~~python
for mask in range(1 << n):                      # 0 .. 2^n - 1
    chosen = [items[i] for i in range(n) if mask >> i & 1]

sub = mask                                      # every submask of mask, then 0
while True:
    visit(sub)
    if sub == 0:
        break
    sub = (sub - 1) & mask
~~~

## 10. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the single-bit and lowest-bit tricks on x = 44** prints:

~~~text
x                      44  00101100
bit 3 set?            true
bit 4 set?            false
set bit 4              60  00111100
clear bit 2            40  00101000
toggle bit 0           45  00101101
lowest set bit x&-x     4  00000100
drop lowest x&(x-1)    40  00101000
low 3 bits mask         7  00000111
keep low 3 bits         4  00000100
x ^ x                   0  00000000
x ^ 0                  44  00101100
power of two: 0=false, 1=true, 6=false, 64=true, 96=false, -8=false
xor swap: a=9 b=5
~~~

The power-of-two line shows why the \`n > 0\` guard exists: without it, 0 would pass the \`n & (n - 1) == 0\` test.

**Example 2 — bitmasks as sets: all subsets, set operations, submask enumeration and the 3^n count** prints:

~~~text
all subsets of [a, b, c] (mask -> set):
  000 -> {}
  001 -> {a}
  010 -> {b}
  011 -> {a, b}
  100 -> {c}
  101 -> {a, c}
  110 -> {b, c}
  111 -> {a, b, c}
A = {1, 2}, B = {0, 1}
union A|B        = {0, 1, 2}
intersection A&B = {1}
difference A&~B  = {2}
sym diff A^B     = {0, 2}
is B subset of A|B: true
submasks of 1011: 1011 1010 1001 1000 0011 0010 0001 0000
count = 8 = 2^popcount = 8
n=10: submask visits 59049, 3^10 = 59049, 4^10 = 1048576
~~~

**Example 3 — 32-bit behaviour emulated in Python with explicit masks** prints:

~~~text
1 << 31 (as int32)      -2147483648
(1 << 31) - 1           2147483647
~0                      -1
-8 >> 1 (arithmetic)    -4
-8 >>> 1 (logical)      2147483644
-1 as unsigned 32-bit   4294967295
popcount(-1), 32 bits   32
INT_MAX + 1 (as int32)  -2147483648
1 << (35 & 31)          8
-7 & 1 (odd test)       1
-7 % 2 != 0 (odd test)  true
~~~

Every line matches what Java and C++ produce natively. The last two lines were written so all four languages agree; the raw Python values differ (\`1 << 35\` is 34359738368 and \`-7 % 2\` is 1), which is exactly the point of section 8.

## Complexity

| Operation | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Test / set / clear / toggle a bit | O(1) | O(1) | one shift and one logic instruction on a machine word |
| \`x & (x - 1)\`, \`x & -x\`, power-of-two test | O(1) | O(1) | one subtraction or negation plus one AND |
| Popcount by Kernighan | O(number of set bits) | O(1) | one loop per 1 bit |
| Enumerate all subsets of n items | O(2^n · n) | O(n) per subset | 2^n masks, n bit tests each |
| Every mask with all its submasks | O(3^n) | O(1) | each item has three states |

The O(1) claims hold for fixed-width machine integers (32 or 64 bits). On arbitrary-size integers (Python \`int\`, \`BigInt\`, \`BigInteger\`) each operation costs time proportional to the number of machine words in the value.

## Edge Cases

- **x = 0:** \`0 & -0 = 0\`, so "lowest set bit" returns 0; the power-of-two test must reject 0 explicitly.
- **Negative x:** the bit pattern is two's complement, so \`-8 & 1\` and \`-7 & 1\` still give the right parity, but "is a power of two" must check \`x > 0\`.
- **The sign bit:** \`1 << 31\` in 32 bits is the most negative int (-2147483648), not 2^31.
- **Shift counts at or beyond the width:** language-dependent; see section 8.
- **Mixed widths:** a mask built in 32 bits cannot reach bit 40; build it in a 64-bit type.

## Common Pitfalls

- **Expecting 32-bit overflow.** \`(1 << 31)\` is 2147483648 in Python, not -2147483648. Mask and convert when the problem assumes 32-bit ints.
- **Reading \`bin()\` of a negative number as two's complement.** \`bin(-5)\` is \`'-0b101'\`; use \`format(x & 0xFF, '08b')\` to see the real low bits.
- **Infinite loops on negatives.** \`while x: x &= x - 1\` never ends for a negative Python int (there are infinitely many 1 bits). Mask to 32 bits first.
- **Copying C-style precedence assumptions into Python, or the other way round.** \`x & 1 == 0\` is fine in Python and a bug in C, Java and JavaScript; always parenthesise.
- **Using \`^\` for power.** \`2 ^ 10\` is 8; power is \`2 ** 10\` or \`1 << 10\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One bit:</strong> <span style="color:#f0e2c8;">Build <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 &lt;&lt; i</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;</code> to test, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">|</code> to set, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp; ~</code> to clear, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">^</code> to toggle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Lowest bit:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &amp; (x - 1)</code> clears the lowest 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &amp; -x</code> isolates it; power of two is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &gt; 0 and x &amp; (x - 1) == 0</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. XOR:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ a == 0</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ 0 == a</code>: pairs cancel (single number, missing number), and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a ^ b).bit_count()</code> is the Hamming distance.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Sets:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">range(1 &lt;&lt; n)</code> enumerates subsets; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sub = (sub - 1) &amp; mask</code> walks submasks; all masks with all submasks is 3^n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python ints:</strong> <span style="color:#f0e2c8;">Unbounded: no overflow and no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;&gt;&gt;</code>. Emulate 32 bits with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp; 0xFFFFFFFF</code> and a sign fix; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bit_count()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bit_length()</code> are built in.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get a logical right shift in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;&gt;&gt;</code>. Mask first: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(x &amp; 0xFFFFFFFF) &gt;&gt; k</code> treats x as an unsigned 32-bit value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">while x: x &amp;= x - 1</code> hang for negative x?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A negative Python int behaves like infinitely many 1 bits, so clearing one at a time never reaches 0. Mask to 32 bits first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">~x</code> return in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Always <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-x - 1</code>, because ints act as infinite two's complement. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">~0</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">~5</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-6</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x &amp; 1 == 0</code> a bug in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No: in Python <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;</code> binds tighter than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>, so it means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(x &amp; 1) == 0</code>. In C, Java and JavaScript it would parse as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &amp; (1 == 0)</code>. Parentheses make it portable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are bit tricks really O(1) in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For values that fit a machine word, effectively yes. Python ints are arbitrary precision, so on huge numbers each operation costs time proportional to the number of digits.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bit / set bit** | A binary digit; a set bit is a 1 |
| **Two's complement** | Signed integers where -x is ~x + 1 and the top bit is the sign |
| **Mask** | A number whose 1 bits mark the positions you want to read or change |
| **Bit shift** | Moving bits left (times 2^k) or right (divide by 2^k) |
| **Lowest set bit (lowbit)** | \`x & -x\`, the rightmost 1 bit of x |
| **Power of two test** | \`x > 0 && (x & (x - 1)) == 0\` |
| **Hamming distance** | Number of differing bits: popcount of \`a ^ b\` |
| **Bitmask** | An integer used as a small set |
| **Submask** | A mask whose bits are a subset of another mask's bits |
| **Arbitrary-precision integer** | An integer with no fixed size (Python \`int\`) |

---
**Conclusion:** A dozen expressions cover almost every bit question: build a mask with \`1 << i\` to test, set, clear or toggle; use \`x & (x - 1)\` and \`x & -x\` for the lowest set bit and the power-of-two test; use XOR's self-cancelling property for pair problems; and treat an integer as a set to enumerate subsets and submasks. In Python, the extra skill is remembering that ints are unbounded: there is no overflow and no \`>>>\`, so you mask with \`0xFFFFFFFF\` whenever the problem assumes 32-bit integers, and you lean on \`bit_count()\`, \`bit_length()\` and \`format(x, 'b')\`.`,
        examples: [
          {
            label: `Single-bit and lowest-bit tricks on x = 44`,
            code: `# The core single-bit tricks, applied to x = 44 (binary 00101100).


def b8(v):
    return format(v, "08b")  # 8-digit binary string


def show(name, v):
    print(name.ljust(22) + str(v).rjust(3) + "  " + b8(v))


x = 44
show("x", x)
print("bit 3 set?".ljust(22) + str((x >> 3) & 1 == 1).lower())
print("bit 4 set?".ljust(22) + str((x >> 4) & 1 == 1).lower())
show("set bit 4", x | (1 << 4))
show("clear bit 2", x & ~(1 << 2))
show("toggle bit 0", x ^ (1 << 0))
show("lowest set bit x&-x", x & -x)
show("drop lowest x&(x-1)", x & (x - 1))
show("low 3 bits mask", (1 << 3) - 1)
show("keep low 3 bits", x & ((1 << 3) - 1))
show("x ^ x", x ^ x)
show("x ^ 0", x ^ 0)


def is_power_of_two(n):
    return n > 0 and n & (n - 1) == 0


print("power of two: " + ", ".join(str(n) + "=" + str(is_power_of_two(n)).lower() for n in [0, 1, 6, 64, 96, -8]))

# XOR swap works, but a plain swap is clearer and just as fast.
a, b = 5, 9
a ^= b
b ^= a
a ^= b
print("xor swap: a=" + str(a) + " b=" + str(b))`,
          },
          {
            label: `Bitmasks as sets: subsets, set operations, submasks, 3^n`,
            code: `# A bitmask is a set: bit i says whether item i is in the set.
items = ["a", "b", "c"]
n = len(items)

print("all subsets of [a, b, c] (mask -> set):")
for mask in range(1 << n):  # 0 .. 2^n - 1
    chosen = [items[i] for i in range(n) if mask >> i & 1]
    print("  " + format(mask, "03b") + " -> {" + ", ".join(chosen) + "}")

# Set operations are single instructions on masks.
A = 0b0110  # {1, 2}
B = 0b0011  # {0, 1}


def members(m):
    return "{" + ", ".join(str(i) for i in range(4) if m >> i & 1) + "}"


print("A = " + members(A) + ", B = " + members(B))
print("union A|B        = " + members(A | B))
print("intersection A&B = " + members(A & B))
print("difference A&~B  = " + members(A & ~B))
print("sym diff A^B     = " + members(A ^ B))
print("is B subset of A|B: " + str((B & (A | B)) == B).lower())

# Walk every submask of 1011 with sub = (sub - 1) & mask.
mask = 0b1011
subs = []
sub = mask
while True:
    subs.append(format(sub, "04b"))
    if sub == 0:
        break
    sub = (sub - 1) & mask
print("submasks of 1011: " + " ".join(subs))
print("count = " + str(len(subs)) + " = 2^popcount = " + str(1 << bin(mask).count("1")))

# Summing over all masks of all their submasks costs 3^n, not 4^n.
total = 0
for m in range(1 << 10):
    s = m
    while True:
        total += 1
        if s == 0:
            break
        s = (s - 1) & m
print("n=10: submask visits " + str(total) + ", 3^10 = " + str(3 ** 10) + ", 4^10 = " + str(4 ** 10))`,
          },
          {
            label: `Emulating 32-bit integers in Python`,
            code: `# Python ints never overflow and act as if they had infinitely many sign bits.
# Interview answers usually assume 32-bit ints, so we convert explicitly.

MASK32 = 0xFFFFFFFF


def to_i32(v):
    """Reinterpret the low 32 bits of v as a signed 32-bit int."""
    v &= MASK32
    return v - (1 << 32) if v >= 1 << 31 else v


def row(label, v):
    print(label.ljust(24) + str(v))


row("1 << 31 (as int32)", to_i32(1 << 31))
row("(1 << 31) - 1", to_i32((1 << 31) - 1))
row("~0", ~0)
row("-8 >> 1 (arithmetic)", -8 >> 1)
row("-8 >>> 1 (logical)", (-8 & MASK32) >> 1)
row("-1 as unsigned 32-bit", -1 & MASK32)
row("popcount(-1), 32 bits", bin(-1 & MASK32).count("1"))
row("INT_MAX + 1 (as int32)", to_i32(2147483647 + 1))
row("1 << (35 & 31)", to_i32(1 << (35 & 31)))  # Python alone: 1 << 35 is 34359738368
row("-7 & 1 (odd test)", -7 & 1)
row("-7 % 2 != 0 (odd test)", str(-7 % 2 != 0).lower())  # -7 % 2 is 1 in Python`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Walk me through the bit manipulation tricks you would actually use in a coding interview, in JavaScript. For each, give the expression, why it works, and what JavaScript's number type does to it."

**What a strong answer should cover:**
- The single-bit operations with a mask: test \`(x >> i) & 1\`, set \`x | (1 << i)\`, clear \`x & ~(1 << i)\`, toggle \`x ^ (1 << i)\`.
- The lowest-set-bit pair: \`x & (x - 1)\` clears it, \`x & -x\` isolates it; the power-of-two test with the \`x > 0\` guard.
- XOR properties and their uses: single number, missing number, Hamming distance.
- Bitmasks as sets: subsets with \`for (let m = 0; m < 1 << n; m++)\`, submasks with \`sub = (sub - 1) & mask\`, and the 3^n total.
- JavaScript details: bitwise operators convert to 32-bit signed integers, \`>>>\` is the unsigned shift (and \`x >>> 0\` converts to unsigned), shift counts are taken mod 32, \`BigInt\` for wider masks, and \`===\` binds tighter than \`&\`.

**Code / implementation expected:** Optional — short JavaScript expressions for each trick, ideally with a small demo on one number.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who are comfortable with loops and integers in JavaScript; binary is explained from scratch.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture the light-switch panel in a small office: eight switches in a row, each controlling one room. To answer "is the kitchen light on?" you look at one switch. To turn the meeting room on without touching anything else, you flip only that switch. To ask "how many rooms are lit?" you count the switches that are up.

An integer inside a computer is exactly such a panel. A 32-bit integer is a row of 32 switches (bits), and the processor can read, set, clear or flip *all of them at once* in a single instruction. Bit manipulation is the habit of treating a number as that row of switches instead of as a quantity.

Interviewers ask about it for three reasons. Some problems become one-liners with the right trick ([single number](/interview-question/how-do-you-find-the-single-number-where-every-other-element-appears-twice), power of two, [counting set bits](/interview-question/how-do-you-count-the-number-of-set-bits-in-an-integer)). A small set stored as bits makes some algorithms fast and compact ([bitmask dynamic programming](/interview-question/what-is-bitmask-dynamic-programming), [generating all subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array)). And the details — negative numbers, shift limits, operator precedence — differ between languages, which reveals whether a candidate really knows the language they are coding in.

This page is a toolkit: about a dozen tricks, why each one works, and the traps in your language.

## 2. Binary in Two Minutes

Each bit position stands for a power of two. Position 0 (the rightmost) is worth 1, position 1 is worth 2, position 2 is worth 4, and so on. The number 44 is 32 + 8 + 4, so bits 5, 3 and 2 are on:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 190" role="img" aria-label="The number 44 as eight bits 00101100, with bit positions 7 to 0 and place values 128 to 1; bits 5, 3 and 2 are set">
  <text class="d-sub" x="75" y="30" text-anchor="middle">bit 7</text>
  <text class="d-sub" x="155" y="30" text-anchor="middle">bit 6</text>
  <text class="d-sub" x="235" y="30" text-anchor="middle">bit 5</text>
  <text class="d-sub" x="315" y="30" text-anchor="middle">bit 4</text>
  <text class="d-sub" x="395" y="30" text-anchor="middle">bit 3</text>
  <text class="d-sub" x="475" y="30" text-anchor="middle">bit 2</text>
  <text class="d-sub" x="555" y="30" text-anchor="middle">bit 1</text>
  <text class="d-sub" x="635" y="30" text-anchor="middle">bit 0</text>
  <rect class="d-box-muted" x="45" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="75" y="86" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="125" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="155" y="86" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="205" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="235" y="86" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="285" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="315" y="86" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="365" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="395" y="86" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="445" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="475" y="86" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="525" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="555" y="86" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="605" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="635" y="86" text-anchor="middle">0</text>
  <text class="d-sub" x="75" y="145" text-anchor="middle">128</text>
  <text class="d-sub" x="155" y="145" text-anchor="middle">64</text>
  <text class="d-sub" x="235" y="145" text-anchor="middle">32</text>
  <text class="d-sub" x="315" y="145" text-anchor="middle">16</text>
  <text class="d-sub" x="395" y="145" text-anchor="middle">8</text>
  <text class="d-sub" x="475" y="145" text-anchor="middle">4</text>
  <text class="d-sub" x="555" y="145" text-anchor="middle">2</text>
  <text class="d-sub" x="635" y="145" text-anchor="middle">1</text>
</svg>

The highlighted bits add up to 32 + 8 + 4 = 44. We use \`x = 44\` for every trick below, and example 1 prints each result.

📌 **Interview term: Bit / set bit** — a bit is one binary digit, 0 or 1. A *set* bit is a bit that is 1; a *clear* bit is 0. "Bit i" means the bit worth 2^i, counting from 0 on the right.

**Negative numbers** are stored in **two's complement**: to get -x, flip every bit of x and add 1. In 8 bits, 4 is \`00000100\`, so -4 is \`11111011 + 1 = 11111100\`. Two consequences matter for tricks: the leftmost bit is the sign bit (1 means negative), and \`-x == ~x + 1\` always.

📌 **Interview term: Two's complement** — the standard way to store signed integers: -x is ~x + 1. The top bit is the sign bit, and -1 is all ones.

## 3. The Six Operators

| Operator | Name | Rule per bit | Example on 4-bit values |
| :--- | :--- | :--- | :--- |
| \`a & b\` | AND | 1 only if both are 1 | \`1100 & 1010 = 1000\` |
| \`a \\| b\` | OR | 1 if either is 1 | \`1100 \\| 1010 = 1110\` |
| \`a ^ b\` | XOR | 1 if they differ | \`1100 ^ 1010 = 0110\` |
| \`~a\` | NOT | flips every bit | \`~1100 = 0011\` (in 4 bits) |
| \`a << k\` | left shift | moves bits k places left, fills 0s | \`0011 << 2 = 1100\` (times 4) |
| \`a >> k\` | right shift | moves bits k places right | \`1100 >> 2 = 0011\` (divide by 4) |

📌 **Interview term: Mask** — a number built so that its 1 bits mark the positions you care about, such as \`1 << i\` for bit i or \`(1 << k) - 1\` for the lowest k bits. You combine it with \`&\`, \`|\` or \`^\` to read or change just those positions.

## 4. Reading and Changing One Bit

Every single-bit trick has the same two steps: build the mask \`1 << i\`, then combine it with \`x\` using the right operator.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Single bit tricks: build the mask 1 shifted left by i, then AND to test, OR to set, AND with NOT mask to clear, XOR to toggle">
  <defs>
    <marker id="b33q1-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="220" height="56" rx="10"/>
  <text class="d-text" x="360" y="46" text-anchor="middle">mask = 1 &lt;&lt; i</text>
  <text class="d-sub" x="360" y="66" text-anchor="middle">a single 1 at bit i</text>
  <path class="d-edge" d="M 300 78 L 105 158" marker-end="url(#b33q1-a1)"/>
  <path class="d-edge" d="M 340 78 L 275 158" marker-end="url(#b33q1-a1)"/>
  <path class="d-edge" d="M 380 78 L 445 158" marker-end="url(#b33q1-a1)"/>
  <path class="d-edge" d="M 420 78 L 615 158" marker-end="url(#b33q1-a1)"/>
  <rect class="d-box" x="30" y="164" width="150" height="90" rx="10"/>
  <text class="d-text" x="105" y="194" text-anchor="middle">test</text>
  <text class="d-sub" x="105" y="218" text-anchor="middle">x &amp; mask</text>
  <text class="d-sub" x="105" y="240" text-anchor="middle">nonzero if set</text>
  <rect class="d-box" x="200" y="164" width="150" height="90" rx="10"/>
  <text class="d-text" x="275" y="194" text-anchor="middle">set</text>
  <text class="d-sub" x="275" y="218" text-anchor="middle">x | mask</text>
  <text class="d-sub" x="275" y="240" text-anchor="middle">forces a 1</text>
  <rect class="d-box" x="370" y="164" width="150" height="90" rx="10"/>
  <text class="d-text" x="445" y="194" text-anchor="middle">clear</text>
  <text class="d-sub" x="445" y="218" text-anchor="middle">x &amp; ~mask</text>
  <text class="d-sub" x="445" y="240" text-anchor="middle">forces a 0</text>
  <rect class="d-box" x="540" y="164" width="150" height="90" rx="10"/>
  <text class="d-text" x="615" y="194" text-anchor="middle">toggle</text>
  <text class="d-sub" x="615" y="218" text-anchor="middle">x ^ mask</text>
  <text class="d-sub" x="615" y="240" text-anchor="middle">flips it</text>
</svg>

Why each one works: AND with 0 always gives 0 and AND with 1 keeps the bit, so \`x & mask\` keeps only bit i. OR with 1 always gives 1, so \`x | mask\` forces bit i on and leaves the rest (OR with 0 keeps a bit). \`~mask\` is all ones except bit i, so \`x & ~mask\` forces only bit i off. XOR with 1 flips a bit and XOR with 0 keeps it, so \`x ^ mask\` flips only bit i.

| Trick | Expression | x = 44 (00101100) gives |
| :--- | :--- | :--- |
| Is bit i set? | \`(x >> i) & 1\` | bit 3: 1 (true), bit 4: 0 (false) |
| Set bit i | \`x \\| (1 << i)\` | i = 4: 60 (00111100) |
| Clear bit i | \`x & ~(1 << i)\` | i = 2: 40 (00101000) |
| Toggle bit i | \`x ^ (1 << i)\` | i = 0: 45 (00101101) |
| Lowest k bits mask | \`(1 << k) - 1\` | k = 3: 7 (00000111) |
| Keep lowest k bits (x mod 2^k) | \`x & ((1 << k) - 1)\` | k = 3: 4 |
| Is x odd? | \`x & 1\` | 0, so even |
| Multiply / divide by 2^k | \`x << k\`, \`x >> k\` | \`44 >> 2 = 11\` |

📌 **Interview term: Bit shift** — \`x << k\` moves every bit k positions left (multiplies by 2^k while nothing falls off the top); \`x >> k\` moves them right (divides by 2^k, rounding toward negative infinity for an arithmetic shift).

## 5. The Lowest Set Bit Family

Two expressions carry a surprising number of interview answers.

**\`x & (x - 1)\` clears the lowest set bit.** Subtracting 1 turns the lowest 1 into 0 and every 0 below it into 1; the bits above are unchanged. AND-ing with the original keeps the high part and wipes everything from the lowest 1 down.

**\`x & -x\` keeps only the lowest set bit.** In two's complement \`-x = ~x + 1\`: flipping every bit and adding 1 makes the carry stop exactly at the lowest 1 of x, so x and -x agree only at that one position.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="For x equal to 44 binary 101100: x minus 1 is 101011 and x AND x minus 1 is 101000; minus x ends in 0100 and x AND minus x is 000100">
  <text class="d-text" x="40" y="40">x</text>
  <text class="d-text" x="200" y="40">0 0 1 0 1 1 0 0</text>
  <text class="d-sub" x="520" y="40">44</text>
  <text class="d-text" x="40" y="80">x - 1</text>
  <text class="d-text" x="200" y="80">0 0 1 0 1 0 1 1</text>
  <text class="d-sub" x="520" y="80">43</text>
  <rect class="d-box-accent" x="180" y="96" width="300" height="40" rx="8"/>
  <text class="d-text" x="40" y="122">x &amp; (x - 1)</text>
  <text class="d-text" x="200" y="122">0 0 1 0 1 0 0 0</text>
  <text class="d-sub" x="520" y="122">40: lowest 1 cleared</text>
  <text class="d-text" x="40" y="186">-x</text>
  <text class="d-text" x="200" y="186">1 1 0 1 0 1 0 0</text>
  <text class="d-sub" x="520" y="186">-44 in 8 bits</text>
  <rect class="d-box-accent" x="180" y="202" width="300" height="40" rx="8"/>
  <text class="d-text" x="40" y="228">x &amp; -x</text>
  <text class="d-text" x="200" y="228">0 0 0 0 0 1 0 0</text>
  <text class="d-sub" x="520" y="228">4: only the lowest 1</text>
</svg>

What they unlock:

- **Power of two:** a power of two has exactly one set bit, so clearing it leaves 0: \`x > 0 && (x & (x - 1)) == 0\`. The \`x > 0\` guard matters: 0 and negative numbers are not powers of two (example 1 checks 0, 1, 6, 64, 96 and -8).
- **Count set bits:** repeat \`x &= x - 1\` until x is 0, counting steps (Brian Kernighan's method, on [its own page](/interview-question/how-do-you-count-the-number-of-set-bits-in-an-integer)).
- **Split on a differing bit:** \`(a ^ b) & -(a ^ b)\` is a bit where a and b differ, the key step of the "two single numbers" follow-up.
- **Fenwick (binary indexed) trees** move between nodes with \`i += i & -i\` and \`i -= i & -i\`.

📌 **Interview term: Lowest set bit (lowbit)** — \`x & -x\`: the value of the rightmost 1 bit of x. \`x & (x - 1)\` is x with that bit removed.

📌 **Interview term: Power of two test** — \`x > 0 && (x & (x - 1)) == 0\`; true exactly when x has a single set bit.

## 6. XOR Tricks

XOR has three properties worth memorising: \`a ^ a = 0\`, \`a ^ 0 = a\`, and the order of a chain of XORs does not matter.

- **Cancel pairs:** XOR a whole array and every value that appears twice disappears; that is the [single number](/interview-question/how-do-you-find-the-single-number-where-every-other-element-appears-twice) problem, and with indices mixed in, the [missing number](/interview-question/how-do-you-find-the-missing-number-in-0-n) problem.
- **Find differing bits:** \`a ^ b\` has a 1 exactly where a and b differ, so \`popcount(a ^ b)\` is the Hamming distance between them.
- **Swap without a temporary:** \`a ^= b; b ^= a; a ^= b\` swaps two variables. It works (example 1), but it is slower to read, no faster on modern hardware, and if both names refer to the same memory it zeroes the value. Mention it as a curiosity, then use a normal swap.
- **Opposite signs:** \`(a ^ b) < 0\` is true when a and b have different sign bits.

📌 **Interview term: Hamming distance** — the number of bit positions where two integers differ: the popcount of \`a ^ b\`.

## 7. A Bitmask Is a Set

If you have n ≤ 30 or so items, one integer can represent any subset of them: bit i is 1 when item i is in the subset. Set operations become single instructions:

| Set operation | Bitmask expression |
| :--- | :--- |
| Empty set / full set | \`0\` / \`(1 << n) - 1\` |
| Add item i / remove item i | \`S \\| (1 << i)\` / \`S & ~(1 << i)\` |
| Union / intersection | \`A \\| B\` / \`A & B\` |
| Difference A minus B | \`A & ~B\` |
| Is B a subset of A? | \`(B & A) == B\` |
| Size of the set | popcount(S) |

**Enumerate all subsets:** loop \`mask\` from 0 to \`(1 << n) - 1\`; each value is one subset. For n = 3 that is the 8 lines in example 2.

**Enumerate the submasks of one mask:** start at \`sub = mask\` and step with \`sub = (sub - 1) & mask\` until you have processed 0. Subtracting 1 borrows through the clear bits, and \`& mask\` throws away bits outside the mask, so you visit every submask in decreasing order, each exactly once. For \`1011\` that is 8 submasks (2 to the power of its 3 set bits).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Submasks of 1011 in the order the loop visits them: 1011, 1010, 1001, 1000, 0011, 0010, 0001, 0000">
  <defs>
    <marker id="b33q1-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="90" y="58" text-anchor="middle">1011</text>
  <rect class="d-box" x="200" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="260" y="58" text-anchor="middle">1010</text>
  <rect class="d-box" x="370" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="430" y="58" text-anchor="middle">1001</text>
  <rect class="d-box" x="540" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="600" y="58" text-anchor="middle">1000</text>
  <path class="d-edge" d="M 152 52 L 194 52" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge" d="M 322 52 L 364 52" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge" d="M 492 52 L 534 52" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge-dashed" d="M 600 76 L 100 124" marker-end="url(#b33q1-a2)"/>
  <rect class="d-box" x="30" y="130" width="120" height="44" rx="8"/>
  <text class="d-text" x="90" y="158" text-anchor="middle">0011</text>
  <rect class="d-box" x="200" y="130" width="120" height="44" rx="8"/>
  <text class="d-text" x="260" y="158" text-anchor="middle">0010</text>
  <rect class="d-box" x="370" y="130" width="120" height="44" rx="8"/>
  <text class="d-text" x="430" y="158" text-anchor="middle">0001</text>
  <rect class="d-box-muted" x="540" y="130" width="120" height="44" rx="8"/>
  <text class="d-text" x="600" y="158" text-anchor="middle">0000</text>
  <path class="d-edge" d="M 152 152 L 194 152" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge" d="M 322 152 L 364 152" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge" d="M 492 152 L 534 152" marker-end="url(#b33q1-a2)"/>
</svg>

Each arrow is one \`sub = (sub - 1) & mask\` step. Bit 2 of the mask is 0, so it never appears in a submask; from 1000, subtracting 1 gives 0111, and \`& 1011\` turns that into 0011.

**The 3^n fact:** if you loop over every mask of n bits and, inside, over all of its submasks, the total work is 3^n, not 4^n, because each item is independently "not in mask", "in mask but not in sub", or "in both". Example 2 counts 59,049 = 3^10 visits for n = 10, against 4^10 = 1,048,576. This bound is what makes many [bitmask DP](/interview-question/what-is-bitmask-dynamic-programming) solutions fast enough.

📌 **Interview term: Bitmask** — an integer used as a set of up to 32 or 64 small items: bit i set means item i is in the set.

📌 **Interview term: Submask** — a mask whose set bits are a subset of another mask's set bits; \`(sub - 1) & mask\` steps through all of them.

## 8. JavaScript Numbers and Bits

A JavaScript Number is a 64-bit floating-point value, but **every bitwise operator first converts its operands to 32-bit integers**: \`&\`, \`|\`, \`^\`, \`~\`, \`<<\` and \`>>\` produce a signed 32-bit result, and \`>>>\` produces an unsigned one ([MDN: Bitwise AND](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_AND)). That one rule explains every surprise:

- **\`1 << 31\` is negative** (-2147483648): bit 31 is the sign bit of the 32-bit result.
- **\`>>>\` is the logical shift.** \`-8 >> 1\` is -4 (sign bit copied in), \`-8 >>> 1\` is 2147483644 (zero copied in). \`x >>> 0\` reinterprets x as unsigned, which is how you print or compare a 32-bit pattern: \`(-1 >>> 0)\` is 4294967295.
- **The shift count is taken mod 32.** \`1 << 35\` is 8, the same as \`1 << 3\`. You cannot build a mask above bit 31 with Number shifts.
- **High bits are dropped.** In our run \`2 ** 40 | 0\` printed \`0\` and \`(2 ** 32 + 5) | 0\` printed \`5\`. Bit tricks on IDs, timestamps or anything above 2^31 are wrong with plain numbers.
- **\`BigInt\` has no width limit.** \`1n << 40n\` is 1099511627776n. Both operands must be BigInt; mixing \`1n ^ 1\` throws \`TypeError\`.
- **Printing binary:** \`(-5).toString(2)\` is \`'-101'\`, a sign plus magnitude; \`(-5 >>> 0).toString(2)\` shows the real 32-bit pattern. Pad with \`padStart(8, '0')\`.
- **Built-ins:** \`Math.clz32(x)\` counts leading zero bits of the 32-bit value (\`Math.clz32(1)\` is 31). There is no built-in popcount.
- **Precedence:** \`===\` and \`==\` bind *tighter* than \`&\`, \`^\` and \`|\`, so \`6 & 1 == 0\` means \`6 & (1 == 0)\` and printed \`0\` in our run. Always write \`(x & 1) === 0\`. Arithmetic binds tighter than shifts: \`1 << n - 1\` is \`1 << (n - 1)\`.
- **\`%\` keeps the dividend's sign:** \`-7 % 2\` is -1, so \`x % 2 === 1\` misses negative odd numbers; \`x & 1\` does not.

Example 3 prints each of these results.

📌 **Interview term: ToInt32 conversion** — the rule that JavaScript bitwise operators apply to Numbers: drop the fraction, wrap modulo 2^32, and read the result as a signed 32-bit integer (unsigned for \`>>>\`).

## 9. The Tricks in JavaScript

~~~javascript
const x = 44;                // 0b101100
(x >> 3) & 1;                // 1: bit 3 is set
x | (1 << 4);                // 60: set bit 4
x & ~(1 << 2);               // 40: clear bit 2
x ^ (1 << 0);                // 45: toggle bit 0
x & -x;                      // 4: lowest set bit
x & (x - 1);                 // 40: lowest set bit cleared
(1 << 3) - 1;                // 7: mask of the low 3 bits
function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0; // parentheses matter: === binds tighter than &
}
~~~

The parentheses around \`n & (n - 1)\` are required in JavaScript: without them, \`n & (n - 1) === 0\` would compute \`(n - 1) === 0\` first.

Bitmask subsets in JavaScript:

~~~javascript
for (let mask = 0; mask < (1 << n); mask++) {    // n <= 30 with Number masks
  const chosen = items.filter((_, i) => (mask >> i) & 1);
}

let sub = mask;                                   // every submask of mask, then 0
while (true) {
  visit(sub);
  if (sub === 0) break;
  sub = (sub - 1) & mask;
}
~~~

## 10. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the single-bit and lowest-bit tricks on x = 44** prints:

~~~text
x                      44  00101100
bit 3 set?            true
bit 4 set?            false
set bit 4              60  00111100
clear bit 2            40  00101000
toggle bit 0           45  00101101
lowest set bit x&-x     4  00000100
drop lowest x&(x-1)    40  00101000
low 3 bits mask         7  00000111
keep low 3 bits         4  00000100
x ^ x                   0  00000000
x ^ 0                  44  00101100
power of two: 0=false, 1=true, 6=false, 64=true, 96=false, -8=false
xor swap: a=9 b=5
~~~

Binary strings come from \`(v >>> 0).toString(2).padStart(8, '0')\`. The power-of-two line shows why the \`n > 0\` guard exists.

**Example 2 — bitmasks as sets: all subsets, set operations, submask enumeration and the 3^n count** prints:

~~~text
all subsets of [a, b, c] (mask -> set):
  000 -> {}
  001 -> {a}
  010 -> {b}
  011 -> {a, b}
  100 -> {c}
  101 -> {a, c}
  110 -> {b, c}
  111 -> {a, b, c}
A = {1, 2}, B = {0, 1}
union A|B        = {0, 1, 2}
intersection A&B = {1}
difference A&~B  = {2}
sym diff A^B     = {0, 2}
is B subset of A|B: true
submasks of 1011: 1011 1010 1001 1000 0011 0010 0001 0000
count = 8 = 2^popcount = 8
n=10: submask visits 59049, 3^10 = 59049, 4^10 = 1048576
~~~

**Example 3 — the 32-bit integer rules of JavaScript bitwise operators** prints:

~~~text
1 << 31 (as int32)      -2147483648
(1 << 31) - 1           2147483647
~0                      -1
-8 >> 1 (arithmetic)    -4
-8 >>> 1 (logical)      2147483644
-1 as unsigned 32-bit   4294967295
popcount(-1), 32 bits   32
INT_MAX + 1 (as int32)  -2147483648
1 << (35 & 31)          8
-7 & 1 (odd test)       1
-7 % 2 != 0 (odd test)  true
~~~

These values come straight from the operators. \`1 << 35\` would also print 8, because the shift count is taken mod 32; the line is written as \`1 << (35 & 31)\` so the Python version can match it.

## Complexity

| Operation | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Test / set / clear / toggle a bit | O(1) | O(1) | one shift and one logic instruction on a machine word |
| \`x & (x - 1)\`, \`x & -x\`, power-of-two test | O(1) | O(1) | one subtraction or negation plus one AND |
| Popcount by Kernighan | O(number of set bits) | O(1) | one loop per 1 bit |
| Enumerate all subsets of n items | O(2^n · n) | O(n) per subset | 2^n masks, n bit tests each |
| Every mask with all its submasks | O(3^n) | O(1) | each item has three states |

The O(1) claims hold for fixed-width machine integers (32 or 64 bits). On arbitrary-size integers (Python \`int\`, \`BigInt\`, \`BigInteger\`) each operation costs time proportional to the number of machine words in the value.

## Edge Cases

- **x = 0:** \`0 & -0 = 0\`, so "lowest set bit" returns 0; the power-of-two test must reject 0 explicitly.
- **Negative x:** the bit pattern is two's complement, so \`-8 & 1\` and \`-7 & 1\` still give the right parity, but "is a power of two" must check \`x > 0\`.
- **The sign bit:** \`1 << 31\` in 32 bits is the most negative int (-2147483648), not 2^31.
- **Shift counts at or beyond the width:** language-dependent; see section 8.
- **Mixed widths:** a mask built in 32 bits cannot reach bit 40; build it in a 64-bit type.

## Common Pitfalls

- **Forgetting parentheses with \`===\`.** \`x & 1 === 0\` is \`x & false\`, always 0. Write \`(x & 1) === 0\`.
- **Masks above bit 31.** \`1 << 40\` is \`1 << 8\` = 256. Use \`BigInt\` (\`1n << 40n\`) or two 32-bit halves.
- **Bit tricks on large numbers.** \`x | 0\` or \`x & y\` on values over 2^31 silently drop high bits; \`Math.trunc\` is the safe way to drop a fraction.
- **Using \`>>\` where you meant \`>>>\`.** Shifting a negative pattern right with \`>>\` copies the sign bit in, so a loop like \`while (x) { x >>= 1; }\` never ends for negative x. Use \`>>>=\`.
- **Printing negatives with \`toString(2)\`.** It shows \`-101\`, not the bit pattern; use \`x >>> 0\` first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One bit:</strong> <span style="color:#f0e2c8;">Build <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 &lt;&lt; i</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;</code> to test, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">|</code> to set, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp; ~</code> to clear, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">^</code> to toggle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Lowest bit:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &amp; (x - 1)</code> clears the lowest 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &amp; -x</code> isolates it; power of two is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &gt; 0 &amp;&amp; (n &amp; (n - 1)) === 0</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. XOR:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ a === 0</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ 0 === a</code>: pairs cancel (single number, missing number); popcount of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ b</code> is the Hamming distance.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Sets:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for (let m = 0; m &lt; 1 &lt;&lt; n; m++)</code> enumerates subsets; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sub = (sub - 1) &amp; mask</code> walks submasks; all masks with all submasks is 3^n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JS numbers:</strong> <span style="color:#f0e2c8;">Bitwise operators work on 32-bit signed ints; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;&gt;&gt;</code> is unsigned, shift counts are mod 32, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> is the escape hatch for wider masks.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">1 &lt;&lt; 31</code> negative in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The result of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;&lt;</code> is a signed 32-bit integer and bit 31 is the sign bit, so it is -2147483648. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(1 &lt;&lt; 31) &gt;&gt;&gt; 0</code> to read it as 2147483648.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you build a mask for bit 40?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with Numbers: the shift count is taken mod 32, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 &lt;&lt; 40</code> is 256. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1n &lt;&lt; 40n</code> with BigInt, and keep every operand BigInt.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&gt;&gt;</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&gt;&gt;&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;&gt;</code> is arithmetic and copies the sign bit (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-8 &gt;&gt; 1</code> is -4); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;&gt;&gt;</code> is logical and fills with 0 (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-8 &gt;&gt;&gt; 1</code> is 2147483644), returning an unsigned value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why must you parenthesise <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">(x &amp; 1) === 0</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In JavaScript equality binds tighter than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;</code>, so without parentheses it computes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 === 0</code> first and then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &amp; false</code>, which is always 0.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a popcount or count-trailing-zeros built-in?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.clz32</code> for leading zeros. Trailing zeros can be computed as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">31 - Math.clz32(x &amp; -x)</code> for nonzero x; popcount needs a loop, a table or the SWAR trick.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bit / set bit** | A binary digit; a set bit is a 1 |
| **Two's complement** | Signed integers where -x is ~x + 1 and the top bit is the sign |
| **Mask** | A number whose 1 bits mark the positions you want to read or change |
| **Bit shift** | Moving bits left (times 2^k) or right (divide by 2^k) |
| **Lowest set bit (lowbit)** | \`x & -x\`, the rightmost 1 bit of x |
| **Power of two test** | \`x > 0 && (x & (x - 1)) == 0\` |
| **Hamming distance** | Number of differing bits: popcount of \`a ^ b\` |
| **Bitmask** | An integer used as a small set |
| **Submask** | A mask whose bits are a subset of another mask's bits |
| **ToInt32 conversion** | How JS bitwise operators turn a Number into a 32-bit integer |

---
**Conclusion:** A dozen expressions cover almost every bit question: build a mask with \`1 << i\` to test, set, clear or toggle; use \`x & (x - 1)\` and \`x & -x\` for the lowest set bit and the power-of-two test; use XOR's self-cancelling property for pair problems; and treat an integer as a set to enumerate subsets and submasks. In JavaScript the extra skill is the 32-bit rule: bitwise operators convert Numbers to signed 32-bit integers, \`>>>\` gives unsigned results, shift counts wrap at 32, equality binds tighter than \`&\`, and anything wider needs \`BigInt\`.`,
        examples: [
          {
            label: `Single-bit and lowest-bit tricks on x = 44`,
            code: `// The core single-bit tricks, applied to x = 44 (binary 00101100).

function b8(v) {
  return (v >>> 0).toString(2).padStart(8, '0'); // 8-digit binary string
}

function show(name, v) {
  console.log(name.padEnd(22) + String(v).padStart(3) + '  ' + b8(v));
}

const x = 44;
show('x', x);
console.log('bit 3 set?'.padEnd(22) + (((x >> 3) & 1) === 1));
console.log('bit 4 set?'.padEnd(22) + (((x >> 4) & 1) === 1));
show('set bit 4', x | (1 << 4));
show('clear bit 2', x & ~(1 << 2));
show('toggle bit 0', x ^ (1 << 0));
show('lowest set bit x&-x', x & -x);
show('drop lowest x&(x-1)', x & (x - 1));
show('low 3 bits mask', (1 << 3) - 1);
show('keep low 3 bits', x & ((1 << 3) - 1));
show('x ^ x', x ^ x);
show('x ^ 0', x ^ 0);

function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0; // parentheses matter: === binds tighter than &
}

console.log('power of two: ' + [0, 1, 6, 64, 96, -8].map((n) => n + '=' + isPowerOfTwo(n)).join(', '));

// XOR swap works, but destructuring [a, b] = [b, a] is clearer.
let a = 5, b = 9;
a ^= b;
b ^= a;
a ^= b;
console.log('xor swap: a=' + a + ' b=' + b);`,
          },
          {
            label: `Bitmasks as sets: subsets, set operations, submasks, 3^n`,
            code: `// A bitmask is a set: bit i says whether item i is in the set.
const items = ['a', 'b', 'c'];
const n = items.length;

console.log('all subsets of [a, b, c] (mask -> set):');
for (let mask = 0; mask < (1 << n); mask++) {
  const chosen = items.filter((_, i) => (mask >> i) & 1);
  console.log('  ' + mask.toString(2).padStart(3, '0') + ' -> {' + chosen.join(', ') + '}');
}

// Set operations are single instructions on masks.
const A = 0b0110; // {1, 2}
const B = 0b0011; // {0, 1}

function members(m) {
  const out = [];
  for (let i = 0; i < 4; i++) if ((m >> i) & 1) out.push(i);
  return '{' + out.join(', ') + '}';
}

console.log('A = ' + members(A) + ', B = ' + members(B));
console.log('union A|B        = ' + members(A | B));
console.log('intersection A&B = ' + members(A & B));
console.log('difference A&~B  = ' + members(A & ~B));
console.log('sym diff A^B     = ' + members(A ^ B));
console.log('is B subset of A|B: ' + ((B & (A | B)) === B));

// Walk every submask of 1011 with sub = (sub - 1) & mask.
const mask = 0b1011;
const subs = [];
let sub = mask;
while (true) {
  subs.push(sub.toString(2).padStart(4, '0'));
  if (sub === 0) break;
  sub = (sub - 1) & mask;
}
let pc = 0;
for (let v = mask; v; v &= v - 1) pc++;
console.log('submasks of 1011: ' + subs.join(' '));
console.log('count = ' + subs.length + ' = 2^popcount = ' + (1 << pc));

// Summing over all masks of all their submasks costs 3^n, not 4^n.
let total = 0;
for (let m = 0; m < (1 << 10); m++) {
  let s = m;
  while (true) {
    total++;
    if (s === 0) break;
    s = (s - 1) & m;
  }
}
console.log('n=10: submask visits ' + total + ', 3^10 = ' + 3 ** 10 + ', 4^10 = ' + 4 ** 10);`,
          },
          {
            label: `The 32-bit rules of JavaScript bitwise operators`,
            code: `// JavaScript numbers are 64-bit floats, but every bitwise operator first
// converts its operands to 32-bit signed ints (>>> converts to unsigned).

function row(label, v) {
  console.log(label.padEnd(24) + v);
}

row('1 << 31 (as int32)', 1 << 31);
row('(1 << 31) - 1', ((1 << 31) - 1) | 0);
row('~0', ~0);
row('-8 >> 1 (arithmetic)', -8 >> 1);
row('-8 >>> 1 (logical)', -8 >>> 1);
row('-1 as unsigned 32-bit', -1 >>> 0);
let pc = 0;
for (let v = -1 >>> 0; v; v >>>= 1) pc += v & 1;
row('popcount(-1), 32 bits', pc);
row('INT_MAX + 1 (as int32)', (2147483647 + 1) | 0);
row('1 << (35 & 31)', 1 << (35 & 31)); // JS masks the count anyway: 1 << 35 is also 8
row('-7 & 1 (odd test)', -7 & 1);
row('-7 % 2 != 0 (odd test)', -7 % 2 !== 0); // -7 % 2 is -1 in JS`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Walk me through the bit manipulation tricks you would actually use in a coding interview, in Java. For each, give the expression, why it works, and what Java's integer types mean for it."

**What a strong answer should cover:**
- The single-bit operations with a mask: test \`(x >> i) & 1\`, set \`x | (1 << i)\`, clear \`x & ~(1 << i)\`, toggle \`x ^ (1 << i)\`.
- The lowest-set-bit pair: \`x & (x - 1)\` clears it, \`x & -x\` isolates it (\`Integer.lowestOneBit\`); the power-of-two test with the \`x > 0\` guard.
- XOR properties and their uses: single number, missing number, Hamming distance (\`Integer.bitCount(a ^ b)\`).
- Bitmasks as sets: subsets with \`for (int m = 0; m < 1 << n; m++)\`, submasks with \`sub = (sub - 1) & mask\`, and the 3^n total.
- Java details: \`int\` is 32-bit and \`long\` 64-bit two's complement, overflow wraps, \`>>>\` is the unsigned shift, shift counts are masked (mod 32 for \`int\`), so \`1L << 40\` not \`1 << 40\`; \`byte\` sign-extends; the \`Integer\` bit utilities.

**Code / implementation expected:** Optional — short Java expressions for each trick, ideally with a small demo on one number.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who are comfortable with loops and integers in Java; binary is explained from scratch.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture the light-switch panel in a small office: eight switches in a row, each controlling one room. To answer "is the kitchen light on?" you look at one switch. To turn the meeting room on without touching anything else, you flip only that switch. To ask "how many rooms are lit?" you count the switches that are up.

An integer inside a computer is exactly such a panel. A 32-bit integer is a row of 32 switches (bits), and the processor can read, set, clear or flip *all of them at once* in a single instruction. Bit manipulation is the habit of treating a number as that row of switches instead of as a quantity.

Interviewers ask about it for three reasons. Some problems become one-liners with the right trick ([single number](/interview-question/how-do-you-find-the-single-number-where-every-other-element-appears-twice), power of two, [counting set bits](/interview-question/how-do-you-count-the-number-of-set-bits-in-an-integer)). A small set stored as bits makes some algorithms fast and compact ([bitmask dynamic programming](/interview-question/what-is-bitmask-dynamic-programming), [generating all subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array)). And the details — negative numbers, shift limits, operator precedence — differ between languages, which reveals whether a candidate really knows the language they are coding in.

This page is a toolkit: about a dozen tricks, why each one works, and the traps in your language.

## 2. Binary in Two Minutes

Each bit position stands for a power of two. Position 0 (the rightmost) is worth 1, position 1 is worth 2, position 2 is worth 4, and so on. The number 44 is 32 + 8 + 4, so bits 5, 3 and 2 are on:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 190" role="img" aria-label="The number 44 as eight bits 00101100, with bit positions 7 to 0 and place values 128 to 1; bits 5, 3 and 2 are set">
  <text class="d-sub" x="75" y="30" text-anchor="middle">bit 7</text>
  <text class="d-sub" x="155" y="30" text-anchor="middle">bit 6</text>
  <text class="d-sub" x="235" y="30" text-anchor="middle">bit 5</text>
  <text class="d-sub" x="315" y="30" text-anchor="middle">bit 4</text>
  <text class="d-sub" x="395" y="30" text-anchor="middle">bit 3</text>
  <text class="d-sub" x="475" y="30" text-anchor="middle">bit 2</text>
  <text class="d-sub" x="555" y="30" text-anchor="middle">bit 1</text>
  <text class="d-sub" x="635" y="30" text-anchor="middle">bit 0</text>
  <rect class="d-box-muted" x="45" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="75" y="86" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="125" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="155" y="86" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="205" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="235" y="86" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="285" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="315" y="86" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="365" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="395" y="86" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="445" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="475" y="86" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="525" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="555" y="86" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="605" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="635" y="86" text-anchor="middle">0</text>
  <text class="d-sub" x="75" y="145" text-anchor="middle">128</text>
  <text class="d-sub" x="155" y="145" text-anchor="middle">64</text>
  <text class="d-sub" x="235" y="145" text-anchor="middle">32</text>
  <text class="d-sub" x="315" y="145" text-anchor="middle">16</text>
  <text class="d-sub" x="395" y="145" text-anchor="middle">8</text>
  <text class="d-sub" x="475" y="145" text-anchor="middle">4</text>
  <text class="d-sub" x="555" y="145" text-anchor="middle">2</text>
  <text class="d-sub" x="635" y="145" text-anchor="middle">1</text>
</svg>

The highlighted bits add up to 32 + 8 + 4 = 44. We use \`x = 44\` for every trick below, and example 1 prints each result.

📌 **Interview term: Bit / set bit** — a bit is one binary digit, 0 or 1. A *set* bit is a bit that is 1; a *clear* bit is 0. "Bit i" means the bit worth 2^i, counting from 0 on the right.

**Negative numbers** are stored in **two's complement**: to get -x, flip every bit of x and add 1. In 8 bits, 4 is \`00000100\`, so -4 is \`11111011 + 1 = 11111100\`. Two consequences matter for tricks: the leftmost bit is the sign bit (1 means negative), and \`-x == ~x + 1\` always.

📌 **Interview term: Two's complement** — the standard way to store signed integers: -x is ~x + 1. The top bit is the sign bit, and -1 is all ones.

## 3. The Six Operators

| Operator | Name | Rule per bit | Example on 4-bit values |
| :--- | :--- | :--- | :--- |
| \`a & b\` | AND | 1 only if both are 1 | \`1100 & 1010 = 1000\` |
| \`a \\| b\` | OR | 1 if either is 1 | \`1100 \\| 1010 = 1110\` |
| \`a ^ b\` | XOR | 1 if they differ | \`1100 ^ 1010 = 0110\` |
| \`~a\` | NOT | flips every bit | \`~1100 = 0011\` (in 4 bits) |
| \`a << k\` | left shift | moves bits k places left, fills 0s | \`0011 << 2 = 1100\` (times 4) |
| \`a >> k\` | right shift | moves bits k places right | \`1100 >> 2 = 0011\` (divide by 4) |

📌 **Interview term: Mask** — a number built so that its 1 bits mark the positions you care about, such as \`1 << i\` for bit i or \`(1 << k) - 1\` for the lowest k bits. You combine it with \`&\`, \`|\` or \`^\` to read or change just those positions.

## 4. Reading and Changing One Bit

Every single-bit trick has the same two steps: build the mask \`1 << i\`, then combine it with \`x\` using the right operator.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Single bit tricks: build the mask 1 shifted left by i, then AND to test, OR to set, AND with NOT mask to clear, XOR to toggle">
  <defs>
    <marker id="b33q1-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="220" height="56" rx="10"/>
  <text class="d-text" x="360" y="46" text-anchor="middle">mask = 1 &lt;&lt; i</text>
  <text class="d-sub" x="360" y="66" text-anchor="middle">a single 1 at bit i</text>
  <path class="d-edge" d="M 300 78 L 105 158" marker-end="url(#b33q1-a1)"/>
  <path class="d-edge" d="M 340 78 L 275 158" marker-end="url(#b33q1-a1)"/>
  <path class="d-edge" d="M 380 78 L 445 158" marker-end="url(#b33q1-a1)"/>
  <path class="d-edge" d="M 420 78 L 615 158" marker-end="url(#b33q1-a1)"/>
  <rect class="d-box" x="30" y="164" width="150" height="90" rx="10"/>
  <text class="d-text" x="105" y="194" text-anchor="middle">test</text>
  <text class="d-sub" x="105" y="218" text-anchor="middle">x &amp; mask</text>
  <text class="d-sub" x="105" y="240" text-anchor="middle">nonzero if set</text>
  <rect class="d-box" x="200" y="164" width="150" height="90" rx="10"/>
  <text class="d-text" x="275" y="194" text-anchor="middle">set</text>
  <text class="d-sub" x="275" y="218" text-anchor="middle">x | mask</text>
  <text class="d-sub" x="275" y="240" text-anchor="middle">forces a 1</text>
  <rect class="d-box" x="370" y="164" width="150" height="90" rx="10"/>
  <text class="d-text" x="445" y="194" text-anchor="middle">clear</text>
  <text class="d-sub" x="445" y="218" text-anchor="middle">x &amp; ~mask</text>
  <text class="d-sub" x="445" y="240" text-anchor="middle">forces a 0</text>
  <rect class="d-box" x="540" y="164" width="150" height="90" rx="10"/>
  <text class="d-text" x="615" y="194" text-anchor="middle">toggle</text>
  <text class="d-sub" x="615" y="218" text-anchor="middle">x ^ mask</text>
  <text class="d-sub" x="615" y="240" text-anchor="middle">flips it</text>
</svg>

Why each one works: AND with 0 always gives 0 and AND with 1 keeps the bit, so \`x & mask\` keeps only bit i. OR with 1 always gives 1, so \`x | mask\` forces bit i on and leaves the rest (OR with 0 keeps a bit). \`~mask\` is all ones except bit i, so \`x & ~mask\` forces only bit i off. XOR with 1 flips a bit and XOR with 0 keeps it, so \`x ^ mask\` flips only bit i.

| Trick | Expression | x = 44 (00101100) gives |
| :--- | :--- | :--- |
| Is bit i set? | \`(x >> i) & 1\` | bit 3: 1 (true), bit 4: 0 (false) |
| Set bit i | \`x \\| (1 << i)\` | i = 4: 60 (00111100) |
| Clear bit i | \`x & ~(1 << i)\` | i = 2: 40 (00101000) |
| Toggle bit i | \`x ^ (1 << i)\` | i = 0: 45 (00101101) |
| Lowest k bits mask | \`(1 << k) - 1\` | k = 3: 7 (00000111) |
| Keep lowest k bits (x mod 2^k) | \`x & ((1 << k) - 1)\` | k = 3: 4 |
| Is x odd? | \`x & 1\` | 0, so even |
| Multiply / divide by 2^k | \`x << k\`, \`x >> k\` | \`44 >> 2 = 11\` |

📌 **Interview term: Bit shift** — \`x << k\` moves every bit k positions left (multiplies by 2^k while nothing falls off the top); \`x >> k\` moves them right (divides by 2^k, rounding toward negative infinity for an arithmetic shift).

## 5. The Lowest Set Bit Family

Two expressions carry a surprising number of interview answers.

**\`x & (x - 1)\` clears the lowest set bit.** Subtracting 1 turns the lowest 1 into 0 and every 0 below it into 1; the bits above are unchanged. AND-ing with the original keeps the high part and wipes everything from the lowest 1 down.

**\`x & -x\` keeps only the lowest set bit.** In two's complement \`-x = ~x + 1\`: flipping every bit and adding 1 makes the carry stop exactly at the lowest 1 of x, so x and -x agree only at that one position.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="For x equal to 44 binary 101100: x minus 1 is 101011 and x AND x minus 1 is 101000; minus x ends in 0100 and x AND minus x is 000100">
  <text class="d-text" x="40" y="40">x</text>
  <text class="d-text" x="200" y="40">0 0 1 0 1 1 0 0</text>
  <text class="d-sub" x="520" y="40">44</text>
  <text class="d-text" x="40" y="80">x - 1</text>
  <text class="d-text" x="200" y="80">0 0 1 0 1 0 1 1</text>
  <text class="d-sub" x="520" y="80">43</text>
  <rect class="d-box-accent" x="180" y="96" width="300" height="40" rx="8"/>
  <text class="d-text" x="40" y="122">x &amp; (x - 1)</text>
  <text class="d-text" x="200" y="122">0 0 1 0 1 0 0 0</text>
  <text class="d-sub" x="520" y="122">40: lowest 1 cleared</text>
  <text class="d-text" x="40" y="186">-x</text>
  <text class="d-text" x="200" y="186">1 1 0 1 0 1 0 0</text>
  <text class="d-sub" x="520" y="186">-44 in 8 bits</text>
  <rect class="d-box-accent" x="180" y="202" width="300" height="40" rx="8"/>
  <text class="d-text" x="40" y="228">x &amp; -x</text>
  <text class="d-text" x="200" y="228">0 0 0 0 0 1 0 0</text>
  <text class="d-sub" x="520" y="228">4: only the lowest 1</text>
</svg>

What they unlock:

- **Power of two:** a power of two has exactly one set bit, so clearing it leaves 0: \`x > 0 && (x & (x - 1)) == 0\`. The \`x > 0\` guard matters: 0 and negative numbers are not powers of two (example 1 checks 0, 1, 6, 64, 96 and -8).
- **Count set bits:** repeat \`x &= x - 1\` until x is 0, counting steps (Brian Kernighan's method, on [its own page](/interview-question/how-do-you-count-the-number-of-set-bits-in-an-integer)).
- **Split on a differing bit:** \`(a ^ b) & -(a ^ b)\` is a bit where a and b differ, the key step of the "two single numbers" follow-up.
- **Fenwick (binary indexed) trees** move between nodes with \`i += i & -i\` and \`i -= i & -i\`.

📌 **Interview term: Lowest set bit (lowbit)** — \`x & -x\`: the value of the rightmost 1 bit of x. \`x & (x - 1)\` is x with that bit removed.

📌 **Interview term: Power of two test** — \`x > 0 && (x & (x - 1)) == 0\`; true exactly when x has a single set bit.

## 6. XOR Tricks

XOR has three properties worth memorising: \`a ^ a = 0\`, \`a ^ 0 = a\`, and the order of a chain of XORs does not matter.

- **Cancel pairs:** XOR a whole array and every value that appears twice disappears; that is the [single number](/interview-question/how-do-you-find-the-single-number-where-every-other-element-appears-twice) problem, and with indices mixed in, the [missing number](/interview-question/how-do-you-find-the-missing-number-in-0-n) problem.
- **Find differing bits:** \`a ^ b\` has a 1 exactly where a and b differ, so \`popcount(a ^ b)\` is the Hamming distance between them.
- **Swap without a temporary:** \`a ^= b; b ^= a; a ^= b\` swaps two variables. It works (example 1), but it is slower to read, no faster on modern hardware, and if both names refer to the same memory it zeroes the value. Mention it as a curiosity, then use a normal swap.
- **Opposite signs:** \`(a ^ b) < 0\` is true when a and b have different sign bits.

📌 **Interview term: Hamming distance** — the number of bit positions where two integers differ: the popcount of \`a ^ b\`.

## 7. A Bitmask Is a Set

If you have n ≤ 30 or so items, one integer can represent any subset of them: bit i is 1 when item i is in the subset. Set operations become single instructions:

| Set operation | Bitmask expression |
| :--- | :--- |
| Empty set / full set | \`0\` / \`(1 << n) - 1\` |
| Add item i / remove item i | \`S \\| (1 << i)\` / \`S & ~(1 << i)\` |
| Union / intersection | \`A \\| B\` / \`A & B\` |
| Difference A minus B | \`A & ~B\` |
| Is B a subset of A? | \`(B & A) == B\` |
| Size of the set | popcount(S) |

**Enumerate all subsets:** loop \`mask\` from 0 to \`(1 << n) - 1\`; each value is one subset. For n = 3 that is the 8 lines in example 2.

**Enumerate the submasks of one mask:** start at \`sub = mask\` and step with \`sub = (sub - 1) & mask\` until you have processed 0. Subtracting 1 borrows through the clear bits, and \`& mask\` throws away bits outside the mask, so you visit every submask in decreasing order, each exactly once. For \`1011\` that is 8 submasks (2 to the power of its 3 set bits).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Submasks of 1011 in the order the loop visits them: 1011, 1010, 1001, 1000, 0011, 0010, 0001, 0000">
  <defs>
    <marker id="b33q1-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="90" y="58" text-anchor="middle">1011</text>
  <rect class="d-box" x="200" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="260" y="58" text-anchor="middle">1010</text>
  <rect class="d-box" x="370" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="430" y="58" text-anchor="middle">1001</text>
  <rect class="d-box" x="540" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="600" y="58" text-anchor="middle">1000</text>
  <path class="d-edge" d="M 152 52 L 194 52" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge" d="M 322 52 L 364 52" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge" d="M 492 52 L 534 52" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge-dashed" d="M 600 76 L 100 124" marker-end="url(#b33q1-a2)"/>
  <rect class="d-box" x="30" y="130" width="120" height="44" rx="8"/>
  <text class="d-text" x="90" y="158" text-anchor="middle">0011</text>
  <rect class="d-box" x="200" y="130" width="120" height="44" rx="8"/>
  <text class="d-text" x="260" y="158" text-anchor="middle">0010</text>
  <rect class="d-box" x="370" y="130" width="120" height="44" rx="8"/>
  <text class="d-text" x="430" y="158" text-anchor="middle">0001</text>
  <rect class="d-box-muted" x="540" y="130" width="120" height="44" rx="8"/>
  <text class="d-text" x="600" y="158" text-anchor="middle">0000</text>
  <path class="d-edge" d="M 152 152 L 194 152" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge" d="M 322 152 L 364 152" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge" d="M 492 152 L 534 152" marker-end="url(#b33q1-a2)"/>
</svg>

Each arrow is one \`sub = (sub - 1) & mask\` step. Bit 2 of the mask is 0, so it never appears in a submask; from 1000, subtracting 1 gives 0111, and \`& 1011\` turns that into 0011.

**The 3^n fact:** if you loop over every mask of n bits and, inside, over all of its submasks, the total work is 3^n, not 4^n, because each item is independently "not in mask", "in mask but not in sub", or "in both". Example 2 counts 59,049 = 3^10 visits for n = 10, against 4^10 = 1,048,576. This bound is what makes many [bitmask DP](/interview-question/what-is-bitmask-dynamic-programming) solutions fast enough.

📌 **Interview term: Bitmask** — an integer used as a set of up to 32 or 64 small items: bit i set means item i is in the set.

📌 **Interview term: Submask** — a mask whose set bits are a subset of another mask's set bits; \`(sub - 1) & mask\` steps through all of them.

## 8. Java Integers and Bits

Java's integer types have fixed sizes on every platform: \`int\` is 32-bit and \`long\` is 64-bit, both two's complement. Overflow wraps silently; it never throws and never misbehaves. That makes Java the most predictable of the four languages for bit tricks, as long as you remember these rules:

- **\`>>\` is arithmetic, \`>>>\` is logical.** \`-8 >> 1\` is -4 and \`-8 >>> 1\` is 2147483644. Loops that shift a value down to zero must use \`>>>\`, or a negative value never reaches 0.
- **Shift counts are masked.** For an \`int\`, only the low 5 bits of the count are used, so \`1 << 40\` is \`1 << 8\` = 256 (our run). For a bit above 31, use a \`long\`: \`1L << 40\` is 1099511627776.
- **\`1 << 31\` is \`Integer.MIN_VALUE\`** (-2147483648), and \`Integer.MAX_VALUE + 1\` wraps to the same value. Example 3 prints both.
- **\`byte\` is signed.** \`(byte) 200\` is -56, and promoting it to \`int\` copies the sign bit; \`b & 0xFF\` recovers 200. This bites in any byte-level problem.
- **\`%\` keeps the dividend's sign:** \`-7 % 2\` is -1 (\`Math.floorMod(-7, 2)\` is 1). Test parity with \`(x & 1) != 0\`.
- **Precedence, with a safety net.** \`==\` binds tighter than \`&\`, so \`x & 1 == 0\` parses as \`x & (1 == 0)\`; in Java that is \`int & boolean\`, which does not compile, so the compiler catches the bug. Write \`(x & 1) == 0\`.
- **Library helpers** in \`Integer\` and \`Long\`: \`bitCount\`, \`lowestOneBit\` (4 for 44), \`highestOneBit\` (32 for 44), \`numberOfTrailingZeros\` (2 for 44), \`numberOfLeadingZeros\`, \`toBinaryString\` (shows the 32-bit pattern of negatives: \`Integer.toBinaryString(-5)\` is 29 ones followed by \`011\`), and \`toUnsignedLong\`. For more than 64 flags, \`java.util.BitSet\`.

📌 **Interview term: Sign extension** — when a narrower signed value (such as a \`byte\`) is widened, its sign bit is copied into all the new high bits; \`& 0xFF\` undoes it.

## 9. The Tricks in Java

~~~java
int x = 44;                  // 0b101100
(x >> 3) & 1;                // 1: bit 3 is set
x | (1 << 4);                // 60: set bit 4
x & ~(1 << 2);               // 40: clear bit 2
x ^ (1 << 0);                // 45: toggle bit 0
x & -x;                      // 4: lowest set bit, same as Integer.lowestOneBit(x)
x & (x - 1);                 // 40: lowest set bit cleared
(1 << 3) - 1;                // 7: mask of the low 3 bits

static boolean isPowerOfTwo(int n) {
    return n > 0 && (n & (n - 1)) == 0; // parentheses matter: == binds tighter than &
}
~~~

(The bare expressions above are for reading; in real Java each would be assigned or printed.) For a bit at position 32 or higher, every literal in the expression must be \`long\`: \`x | (1L << 40)\` with \`long x\`.

Bitmask subsets in Java:

~~~java
for (int mask = 0; mask < (1 << n); mask++) {          // n <= 30 with int masks
    for (int i = 0; i < n; i++)
        if (((mask >> i) & 1) == 1) { /* item i is in this subset */ }
}

int sub = mask;                                          // every submask of mask, then 0
while (true) {
    visit(sub);
    if (sub == 0) break;
    sub = (sub - 1) & mask;
}
~~~

## 10. Verified: Running the Code

Each example was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the single-bit and lowest-bit tricks on x = 44** prints:

~~~text
x                      44  00101100
bit 3 set?            true
bit 4 set?            false
set bit 4              60  00111100
clear bit 2            40  00101000
toggle bit 0           45  00101101
lowest set bit x&-x     4  00000100
drop lowest x&(x-1)    40  00101000
low 3 bits mask         7  00000111
keep low 3 bits         4  00000100
x ^ x                   0  00000000
x ^ 0                  44  00101100
power of two: 0=false, 1=true, 6=false, 64=true, 96=false, -8=false
xor swap: a=9 b=5
~~~

Binary strings come from \`Integer.toBinaryString(v & 0xFF)\` padded to 8 digits. The power-of-two line shows why the \`n > 0\` guard exists.

**Example 2 — bitmasks as sets: all subsets, set operations, submask enumeration and the 3^n count** prints:

~~~text
all subsets of [a, b, c] (mask -> set):
  000 -> {}
  001 -> {a}
  010 -> {b}
  011 -> {a, b}
  100 -> {c}
  101 -> {a, c}
  110 -> {b, c}
  111 -> {a, b, c}
A = {1, 2}, B = {0, 1}
union A|B        = {0, 1, 2}
intersection A&B = {1}
difference A&~B  = {2}
sym diff A^B     = {0, 2}
is B subset of A|B: true
submasks of 1011: 1011 1010 1001 1000 0011 0010 0001 0000
count = 8 = 2^popcount = 8
n=10: submask visits 59049, 3^10 = 59049, 4^10 = 1048576
~~~

The \`2^popcount\` value comes from \`Integer.bitCount(mask)\`.

**Example 3 — Java int rules: wrap-around, the two right shifts, and masked shift counts** prints:

~~~text
1 << 31 (as int32)      -2147483648
(1 << 31) - 1           2147483647
~0                      -1
-8 >> 1 (arithmetic)    -4
-8 >>> 1 (logical)      2147483644
-1 as unsigned 32-bit   4294967295
popcount(-1), 32 bits   32
INT_MAX + 1 (as int32)  -2147483648
1 << (35 & 31)          8
-7 & 1 (odd test)       1
-7 % 2 != 0 (odd test)  true
~~~

\`1 << 35\` would also print 8 in Java (the count is masked to 5 bits); it is written \`1 << (35 & 31)\` so the Python version can match it.

## Complexity

| Operation | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Test / set / clear / toggle a bit | O(1) | O(1) | one shift and one logic instruction on a machine word |
| \`x & (x - 1)\`, \`x & -x\`, power-of-two test | O(1) | O(1) | one subtraction or negation plus one AND |
| Popcount by Kernighan | O(number of set bits) | O(1) | one loop per 1 bit |
| Enumerate all subsets of n items | O(2^n · n) | O(n) per subset | 2^n masks, n bit tests each |
| Every mask with all its submasks | O(3^n) | O(1) | each item has three states |

The O(1) claims hold for fixed-width machine integers (32 or 64 bits). On arbitrary-size integers (Python \`int\`, \`BigInt\`, \`BigInteger\`) each operation costs time proportional to the number of machine words in the value.

## Edge Cases

- **x = 0:** \`0 & -0 = 0\`, so "lowest set bit" returns 0; the power-of-two test must reject 0 explicitly.
- **Negative x:** the bit pattern is two's complement, so \`-8 & 1\` and \`-7 & 1\` still give the right parity, but "is a power of two" must check \`x > 0\`.
- **The sign bit:** \`1 << 31\` in 32 bits is the most negative int (-2147483648), not 2^31.
- **Shift counts at or beyond the width:** language-dependent; see section 8.
- **Mixed widths:** a mask built in 32 bits cannot reach bit 40; build it in a 64-bit type.

## Common Pitfalls

- **\`1 << 40\` on an \`int\`.** It is 256, not 2^40. Use \`1L << 40\` and a \`long\` variable.
- **\`>>\` in a loop that should end at zero.** For negative values the sign bit keeps refilling; use \`>>>\`.
- **Forgetting \`& 0xFF\` on bytes.** \`(byte) 200\` widens to -56, so bit tests on the widened value see 24 extra ones.
- **Overflow in mask arithmetic.** \`(1 << 31) - 1\` happens to give \`Integer.MAX_VALUE\` only because the wrap is defined; for n = 32 use \`-1\` or \`0xFFFFFFFF\` directly.
- **Comparing boxed masks.** A \`List<Integer>\` of masks compared with \`==\` checks object identity above 127; use \`equals\` or \`int\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One bit:</strong> <span style="color:#f0e2c8;">Build <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 &lt;&lt; i</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;</code> to test, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">|</code> to set, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp; ~</code> to clear, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">^</code> to toggle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Lowest bit:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &amp; (x - 1)</code> clears the lowest 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &amp; -x</code> (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.lowestOneBit</code>) isolates it; power of two is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &gt; 0 &amp;&amp; (n &amp; (n - 1)) == 0</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. XOR:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ a == 0</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ 0 == a</code>: pairs cancel; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.bitCount(a ^ b)</code> is the Hamming distance.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Sets:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for (int m = 0; m &lt; 1 &lt;&lt; n; m++)</code> enumerates subsets; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sub = (sub - 1) &amp; mask</code> walks submasks; all masks with all submasks is 3^n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java ints:</strong> <span style="color:#f0e2c8;">Fixed 32/64-bit two's complement, overflow wraps, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;&gt;&gt;</code> is unsigned, shift counts are masked, so bits above 31 need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1L &lt;&lt;</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">1 &lt;&lt; 40</code> equal to 256 in Java?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> the shift count is masked to its low 5 bits, so 40 becomes 8. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1L &lt;&lt; 40</code>, where the count is masked to 6 bits.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When do you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&gt;&gt;&gt;</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&gt;&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Whenever you treat the value as raw bits rather than a signed number: shifting a negative <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;&gt;</code> copies the sign bit, so a loop shifting to zero would never end.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which built-ins would you mention?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.bitCount</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lowestOneBit</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">highestOneBit</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">numberOfTrailingZeros</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">numberOfLeadingZeros</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">toBinaryString</code>, plus the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Long</code> versions and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BitSet</code> for large sets.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x &amp; 1 == 0</code> in Java?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It does not compile: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> binds tighter, leaving <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int &amp; boolean</code>. The fix is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(x &amp; 1) == 0</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why mask a byte with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">0xFF</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">byte</code> is signed, so widening <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(byte) 200</code> gives -56 with 24 extra one bits. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b &amp; 0xFF</code> keeps only the 8 real bits and gives 200.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bit / set bit** | A binary digit; a set bit is a 1 |
| **Two's complement** | Signed integers where -x is ~x + 1 and the top bit is the sign |
| **Mask** | A number whose 1 bits mark the positions you want to read or change |
| **Bit shift** | Moving bits left (times 2^k) or right (divide by 2^k) |
| **Lowest set bit (lowbit)** | \`x & -x\`, the rightmost 1 bit of x |
| **Power of two test** | \`x > 0 && (x & (x - 1)) == 0\` |
| **Hamming distance** | Number of differing bits: popcount of \`a ^ b\` |
| **Bitmask** | An integer used as a small set |
| **Submask** | A mask whose bits are a subset of another mask's bits |
| **Sign extension** | Copying the sign bit into the new high bits when widening a signed value |

---
**Conclusion:** A dozen expressions cover almost every bit question: build a mask with \`1 << i\` to test, set, clear or toggle; use \`x & (x - 1)\` and \`x & -x\` for the lowest set bit and the power-of-two test; use XOR's self-cancelling property for pair problems; and treat an integer as a set to enumerate subsets and submasks. In Java the integer model is fixed and well defined, so the skills are knowing \`>>\` vs \`>>>\`, using \`1L <<\` past bit 31, masking bytes with \`0xFF\`, and reaching for the \`Integer\`/\`Long\` bit utilities.`,
        examples: [
          {
            label: `Single-bit and lowest-bit tricks on x = 44`,
            code: `// The core single-bit tricks, applied to x = 44 (binary 00101100).
public class Main {
    static String b8(int v) {
        return String.format("%8s", Integer.toBinaryString(v & 0xFF)).replace(' ', '0');
    }

    static void show(String name, int v) {
        System.out.println(String.format("%-22s%3d  %s", name, v, b8(v)));
    }

    static boolean isPowerOfTwo(int n) {
        return n > 0 && (n & (n - 1)) == 0; // parentheses matter: == binds tighter than &
    }

    public static void main(String[] args) {
        int x = 44;
        show("x", x);
        System.out.println(String.format("%-22s%b", "bit 3 set?", ((x >> 3) & 1) == 1));
        System.out.println(String.format("%-22s%b", "bit 4 set?", ((x >> 4) & 1) == 1));
        show("set bit 4", x | (1 << 4));
        show("clear bit 2", x & ~(1 << 2));
        show("toggle bit 0", x ^ (1 << 0));
        show("lowest set bit x&-x", x & -x);
        show("drop lowest x&(x-1)", x & (x - 1));
        show("low 3 bits mask", (1 << 3) - 1);
        show("keep low 3 bits", x & ((1 << 3) - 1));
        show("x ^ x", x ^ x);
        show("x ^ 0", x ^ 0);

        StringBuilder sb = new StringBuilder("power of two: ");
        int[] tests = {0, 1, 6, 64, 96, -8};
        for (int i = 0; i < tests.length; i++) {
            if (i > 0) sb.append(", ");
            sb.append(tests[i]).append("=").append(isPowerOfTwo(tests[i]));
        }
        System.out.println(sb);

        // XOR swap works, but a temp variable is clearer.
        int a = 5, b = 9;
        a ^= b;
        b ^= a;
        a ^= b;
        System.out.println("xor swap: a=" + a + " b=" + b);
    }
}`,
          },
          {
            label: `Bitmasks as sets: subsets, set operations, submasks, 3^n`,
            code: `import java.util.ArrayList;
import java.util.List;
import java.util.StringJoiner;

// A bitmask is a set: bit i says whether item i is in the set.
public class Main {
    static String members(int m) {
        StringJoiner sj = new StringJoiner(", ", "{", "}");
        for (int i = 0; i < 4; i++) if (((m >> i) & 1) == 1) sj.add(String.valueOf(i));
        return sj.toString();
    }

    static String bin(int v, int width) {
        return String.format("%" + width + "s", Integer.toBinaryString(v)).replace(' ', '0');
    }

    public static void main(String[] args) {
        String[] items = {"a", "b", "c"};
        int n = items.length;
        System.out.println("all subsets of [a, b, c] (mask -> set):");
        for (int mask = 0; mask < (1 << n); mask++) {
            StringJoiner sj = new StringJoiner(", ", "{", "}");
            for (int i = 0; i < n; i++) if (((mask >> i) & 1) == 1) sj.add(items[i]);
            System.out.println("  " + bin(mask, 3) + " -> " + sj);
        }

        int A = 0b0110; // {1, 2}
        int B = 0b0011; // {0, 1}
        System.out.println("A = " + members(A) + ", B = " + members(B));
        System.out.println("union A|B        = " + members(A | B));
        System.out.println("intersection A&B = " + members(A & B));
        System.out.println("difference A&~B  = " + members(A & ~B));
        System.out.println("sym diff A^B     = " + members(A ^ B));
        System.out.println("is B subset of A|B: " + ((B & (A | B)) == B));

        // Walk every submask of 1011 with sub = (sub - 1) & mask.
        int mask = 0b1011;
        List<String> subs = new ArrayList<>();
        int sub = mask;
        while (true) {
            subs.add(bin(sub, 4));
            if (sub == 0) break;
            sub = (sub - 1) & mask;
        }
        System.out.println("submasks of 1011: " + String.join(" ", subs));
        System.out.println("count = " + subs.size() + " = 2^popcount = " + (1 << Integer.bitCount(mask)));

        // Summing over all masks of all their submasks costs 3^n, not 4^n.
        long total = 0;
        for (int m = 0; m < (1 << 10); m++) {
            int s = m;
            while (true) {
                total++;
                if (s == 0) break;
                s = (s - 1) & m;
            }
        }
        System.out.println("n=10: submask visits " + total + ", 3^10 = " + (int) Math.pow(3, 10) + ", 4^10 = " + (1 << 20));
    }
}`,
          },
          {
            label: `Java int rules: wrap-around, >> vs >>>, shift counts`,
            code: `// Java int is exactly 32-bit two's complement: overflow wraps, and Java has
// both >> (arithmetic) and >>> (logical) right shifts.
public class Main {
    static void row(String label, long v) {
        System.out.println(String.format("%-24s%d", label, v));
    }

    public static void main(String[] args) {
        row("1 << 31 (as int32)", 1 << 31);
        row("(1 << 31) - 1", (1 << 31) - 1);
        row("~0", ~0);
        row("-8 >> 1 (arithmetic)", -8 >> 1);
        row("-8 >>> 1 (logical)", -8 >>> 1);
        row("-1 as unsigned 32-bit", Integer.toUnsignedLong(-1));
        row("popcount(-1), 32 bits", Integer.bitCount(-1));
        int max = Integer.MAX_VALUE;
        row("INT_MAX + 1 (as int32)", max + 1);
        int shift = 35;
        row("1 << (35 & 31)", 1 << (shift & 31)); // Java masks the count anyway: 1 << 35 is also 8
        row("-7 & 1 (odd test)", -7 & 1);
        System.out.println(String.format("%-24s%b", "-7 % 2 != 0 (odd test)", -7 % 2 != 0)); // -7 % 2 is -1 in Java
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Walk me through the bit manipulation tricks you would actually use in a coding interview, in C++. For each, give the expression, why it works, and what can go wrong with C++ integer types."

**What a strong answer should cover:**
- The single-bit operations with a mask: test \`(x >> i) & 1\`, set \`x | (1u << i)\`, clear \`x & ~(1u << i)\`, toggle \`x ^ (1u << i)\`.
- The lowest-set-bit pair: \`x & (x - 1)\` clears it, \`x & -x\` isolates it; the power-of-two test with the \`x > 0\` guard.
- XOR properties and their uses: single number, missing number, Hamming distance.
- Bitmasks as sets: subsets with \`for (int m = 0; m < 1 << n; m++)\`, submasks with \`sub = (sub - 1) & mask\`, and the 3^n total.
- C++ details: do bit work on unsigned types (\`uint32_t\`, \`uint64_t\`); signed overflow and shifting by the width or more are undefined behaviour; \`1 << 40\` needs \`1ULL << 40\`; \`std::bitset\` and the GCC/Clang \`__builtin_popcount\`/\`__builtin_ctz\` (C++20 adds \`<bit>\`).

**Code / implementation expected:** Optional — short C++ expressions for each trick, ideally with a small demo on one number.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who are comfortable with loops and integers in C++; binary is explained from scratch.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Picture the light-switch panel in a small office: eight switches in a row, each controlling one room. To answer "is the kitchen light on?" you look at one switch. To turn the meeting room on without touching anything else, you flip only that switch. To ask "how many rooms are lit?" you count the switches that are up.

An integer inside a computer is exactly such a panel. A 32-bit integer is a row of 32 switches (bits), and the processor can read, set, clear or flip *all of them at once* in a single instruction. Bit manipulation is the habit of treating a number as that row of switches instead of as a quantity.

Interviewers ask about it for three reasons. Some problems become one-liners with the right trick ([single number](/interview-question/how-do-you-find-the-single-number-where-every-other-element-appears-twice), power of two, [counting set bits](/interview-question/how-do-you-count-the-number-of-set-bits-in-an-integer)). A small set stored as bits makes some algorithms fast and compact ([bitmask dynamic programming](/interview-question/what-is-bitmask-dynamic-programming), [generating all subsets](/interview-question/how-do-you-generate-all-subsets-of-an-array)). And the details — negative numbers, shift limits, operator precedence — differ between languages, which reveals whether a candidate really knows the language they are coding in.

This page is a toolkit: about a dozen tricks, why each one works, and the traps in your language.

## 2. Binary in Two Minutes

Each bit position stands for a power of two. Position 0 (the rightmost) is worth 1, position 1 is worth 2, position 2 is worth 4, and so on. The number 44 is 32 + 8 + 4, so bits 5, 3 and 2 are on:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 190" role="img" aria-label="The number 44 as eight bits 00101100, with bit positions 7 to 0 and place values 128 to 1; bits 5, 3 and 2 are set">
  <text class="d-sub" x="75" y="30" text-anchor="middle">bit 7</text>
  <text class="d-sub" x="155" y="30" text-anchor="middle">bit 6</text>
  <text class="d-sub" x="235" y="30" text-anchor="middle">bit 5</text>
  <text class="d-sub" x="315" y="30" text-anchor="middle">bit 4</text>
  <text class="d-sub" x="395" y="30" text-anchor="middle">bit 3</text>
  <text class="d-sub" x="475" y="30" text-anchor="middle">bit 2</text>
  <text class="d-sub" x="555" y="30" text-anchor="middle">bit 1</text>
  <text class="d-sub" x="635" y="30" text-anchor="middle">bit 0</text>
  <rect class="d-box-muted" x="45" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="75" y="86" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="125" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="155" y="86" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="205" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="235" y="86" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="285" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="315" y="86" text-anchor="middle">0</text>
  <rect class="d-box-accent" x="365" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="395" y="86" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="445" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="475" y="86" text-anchor="middle">1</text>
  <rect class="d-box-muted" x="525" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="555" y="86" text-anchor="middle">0</text>
  <rect class="d-box-muted" x="605" y="50" width="60" height="60" rx="8"/>
  <text class="d-text" x="635" y="86" text-anchor="middle">0</text>
  <text class="d-sub" x="75" y="145" text-anchor="middle">128</text>
  <text class="d-sub" x="155" y="145" text-anchor="middle">64</text>
  <text class="d-sub" x="235" y="145" text-anchor="middle">32</text>
  <text class="d-sub" x="315" y="145" text-anchor="middle">16</text>
  <text class="d-sub" x="395" y="145" text-anchor="middle">8</text>
  <text class="d-sub" x="475" y="145" text-anchor="middle">4</text>
  <text class="d-sub" x="555" y="145" text-anchor="middle">2</text>
  <text class="d-sub" x="635" y="145" text-anchor="middle">1</text>
</svg>

The highlighted bits add up to 32 + 8 + 4 = 44. We use \`x = 44\` for every trick below, and example 1 prints each result.

📌 **Interview term: Bit / set bit** — a bit is one binary digit, 0 or 1. A *set* bit is a bit that is 1; a *clear* bit is 0. "Bit i" means the bit worth 2^i, counting from 0 on the right.

**Negative numbers** are stored in **two's complement**: to get -x, flip every bit of x and add 1. In 8 bits, 4 is \`00000100\`, so -4 is \`11111011 + 1 = 11111100\`. Two consequences matter for tricks: the leftmost bit is the sign bit (1 means negative), and \`-x == ~x + 1\` always.

📌 **Interview term: Two's complement** — the standard way to store signed integers: -x is ~x + 1. The top bit is the sign bit, and -1 is all ones.

## 3. The Six Operators

| Operator | Name | Rule per bit | Example on 4-bit values |
| :--- | :--- | :--- | :--- |
| \`a & b\` | AND | 1 only if both are 1 | \`1100 & 1010 = 1000\` |
| \`a \\| b\` | OR | 1 if either is 1 | \`1100 \\| 1010 = 1110\` |
| \`a ^ b\` | XOR | 1 if they differ | \`1100 ^ 1010 = 0110\` |
| \`~a\` | NOT | flips every bit | \`~1100 = 0011\` (in 4 bits) |
| \`a << k\` | left shift | moves bits k places left, fills 0s | \`0011 << 2 = 1100\` (times 4) |
| \`a >> k\` | right shift | moves bits k places right | \`1100 >> 2 = 0011\` (divide by 4) |

📌 **Interview term: Mask** — a number built so that its 1 bits mark the positions you care about, such as \`1 << i\` for bit i or \`(1 << k) - 1\` for the lowest k bits. You combine it with \`&\`, \`|\` or \`^\` to read or change just those positions.

## 4. Reading and Changing One Bit

Every single-bit trick has the same two steps: build the mask \`1 << i\`, then combine it with \`x\` using the right operator.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Single bit tricks: build the mask 1 shifted left by i, then AND to test, OR to set, AND with NOT mask to clear, XOR to toggle">
  <defs>
    <marker id="b33q1-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="220" height="56" rx="10"/>
  <text class="d-text" x="360" y="46" text-anchor="middle">mask = 1 &lt;&lt; i</text>
  <text class="d-sub" x="360" y="66" text-anchor="middle">a single 1 at bit i</text>
  <path class="d-edge" d="M 300 78 L 105 158" marker-end="url(#b33q1-a1)"/>
  <path class="d-edge" d="M 340 78 L 275 158" marker-end="url(#b33q1-a1)"/>
  <path class="d-edge" d="M 380 78 L 445 158" marker-end="url(#b33q1-a1)"/>
  <path class="d-edge" d="M 420 78 L 615 158" marker-end="url(#b33q1-a1)"/>
  <rect class="d-box" x="30" y="164" width="150" height="90" rx="10"/>
  <text class="d-text" x="105" y="194" text-anchor="middle">test</text>
  <text class="d-sub" x="105" y="218" text-anchor="middle">x &amp; mask</text>
  <text class="d-sub" x="105" y="240" text-anchor="middle">nonzero if set</text>
  <rect class="d-box" x="200" y="164" width="150" height="90" rx="10"/>
  <text class="d-text" x="275" y="194" text-anchor="middle">set</text>
  <text class="d-sub" x="275" y="218" text-anchor="middle">x | mask</text>
  <text class="d-sub" x="275" y="240" text-anchor="middle">forces a 1</text>
  <rect class="d-box" x="370" y="164" width="150" height="90" rx="10"/>
  <text class="d-text" x="445" y="194" text-anchor="middle">clear</text>
  <text class="d-sub" x="445" y="218" text-anchor="middle">x &amp; ~mask</text>
  <text class="d-sub" x="445" y="240" text-anchor="middle">forces a 0</text>
  <rect class="d-box" x="540" y="164" width="150" height="90" rx="10"/>
  <text class="d-text" x="615" y="194" text-anchor="middle">toggle</text>
  <text class="d-sub" x="615" y="218" text-anchor="middle">x ^ mask</text>
  <text class="d-sub" x="615" y="240" text-anchor="middle">flips it</text>
</svg>

Why each one works: AND with 0 always gives 0 and AND with 1 keeps the bit, so \`x & mask\` keeps only bit i. OR with 1 always gives 1, so \`x | mask\` forces bit i on and leaves the rest (OR with 0 keeps a bit). \`~mask\` is all ones except bit i, so \`x & ~mask\` forces only bit i off. XOR with 1 flips a bit and XOR with 0 keeps it, so \`x ^ mask\` flips only bit i.

| Trick | Expression | x = 44 (00101100) gives |
| :--- | :--- | :--- |
| Is bit i set? | \`(x >> i) & 1\` | bit 3: 1 (true), bit 4: 0 (false) |
| Set bit i | \`x \\| (1 << i)\` | i = 4: 60 (00111100) |
| Clear bit i | \`x & ~(1 << i)\` | i = 2: 40 (00101000) |
| Toggle bit i | \`x ^ (1 << i)\` | i = 0: 45 (00101101) |
| Lowest k bits mask | \`(1 << k) - 1\` | k = 3: 7 (00000111) |
| Keep lowest k bits (x mod 2^k) | \`x & ((1 << k) - 1)\` | k = 3: 4 |
| Is x odd? | \`x & 1\` | 0, so even |
| Multiply / divide by 2^k | \`x << k\`, \`x >> k\` | \`44 >> 2 = 11\` |

📌 **Interview term: Bit shift** — \`x << k\` moves every bit k positions left (multiplies by 2^k while nothing falls off the top); \`x >> k\` moves them right (divides by 2^k, rounding toward negative infinity for an arithmetic shift).

## 5. The Lowest Set Bit Family

Two expressions carry a surprising number of interview answers.

**\`x & (x - 1)\` clears the lowest set bit.** Subtracting 1 turns the lowest 1 into 0 and every 0 below it into 1; the bits above are unchanged. AND-ing with the original keeps the high part and wipes everything from the lowest 1 down.

**\`x & -x\` keeps only the lowest set bit.** In two's complement \`-x = ~x + 1\`: flipping every bit and adding 1 makes the carry stop exactly at the lowest 1 of x, so x and -x agree only at that one position.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 280" role="img" aria-label="For x equal to 44 binary 101100: x minus 1 is 101011 and x AND x minus 1 is 101000; minus x ends in 0100 and x AND minus x is 000100">
  <text class="d-text" x="40" y="40">x</text>
  <text class="d-text" x="200" y="40">0 0 1 0 1 1 0 0</text>
  <text class="d-sub" x="520" y="40">44</text>
  <text class="d-text" x="40" y="80">x - 1</text>
  <text class="d-text" x="200" y="80">0 0 1 0 1 0 1 1</text>
  <text class="d-sub" x="520" y="80">43</text>
  <rect class="d-box-accent" x="180" y="96" width="300" height="40" rx="8"/>
  <text class="d-text" x="40" y="122">x &amp; (x - 1)</text>
  <text class="d-text" x="200" y="122">0 0 1 0 1 0 0 0</text>
  <text class="d-sub" x="520" y="122">40: lowest 1 cleared</text>
  <text class="d-text" x="40" y="186">-x</text>
  <text class="d-text" x="200" y="186">1 1 0 1 0 1 0 0</text>
  <text class="d-sub" x="520" y="186">-44 in 8 bits</text>
  <rect class="d-box-accent" x="180" y="202" width="300" height="40" rx="8"/>
  <text class="d-text" x="40" y="228">x &amp; -x</text>
  <text class="d-text" x="200" y="228">0 0 0 0 0 1 0 0</text>
  <text class="d-sub" x="520" y="228">4: only the lowest 1</text>
</svg>

What they unlock:

- **Power of two:** a power of two has exactly one set bit, so clearing it leaves 0: \`x > 0 && (x & (x - 1)) == 0\`. The \`x > 0\` guard matters: 0 and negative numbers are not powers of two (example 1 checks 0, 1, 6, 64, 96 and -8).
- **Count set bits:** repeat \`x &= x - 1\` until x is 0, counting steps (Brian Kernighan's method, on [its own page](/interview-question/how-do-you-count-the-number-of-set-bits-in-an-integer)).
- **Split on a differing bit:** \`(a ^ b) & -(a ^ b)\` is a bit where a and b differ, the key step of the "two single numbers" follow-up.
- **Fenwick (binary indexed) trees** move between nodes with \`i += i & -i\` and \`i -= i & -i\`.

📌 **Interview term: Lowest set bit (lowbit)** — \`x & -x\`: the value of the rightmost 1 bit of x. \`x & (x - 1)\` is x with that bit removed.

📌 **Interview term: Power of two test** — \`x > 0 && (x & (x - 1)) == 0\`; true exactly when x has a single set bit.

## 6. XOR Tricks

XOR has three properties worth memorising: \`a ^ a = 0\`, \`a ^ 0 = a\`, and the order of a chain of XORs does not matter.

- **Cancel pairs:** XOR a whole array and every value that appears twice disappears; that is the [single number](/interview-question/how-do-you-find-the-single-number-where-every-other-element-appears-twice) problem, and with indices mixed in, the [missing number](/interview-question/how-do-you-find-the-missing-number-in-0-n) problem.
- **Find differing bits:** \`a ^ b\` has a 1 exactly where a and b differ, so \`popcount(a ^ b)\` is the Hamming distance between them.
- **Swap without a temporary:** \`a ^= b; b ^= a; a ^= b\` swaps two variables. It works (example 1), but it is slower to read, no faster on modern hardware, and if both names refer to the same memory it zeroes the value. Mention it as a curiosity, then use a normal swap.
- **Opposite signs:** \`(a ^ b) < 0\` is true when a and b have different sign bits.

📌 **Interview term: Hamming distance** — the number of bit positions where two integers differ: the popcount of \`a ^ b\`.

## 7. A Bitmask Is a Set

If you have n ≤ 30 or so items, one integer can represent any subset of them: bit i is 1 when item i is in the subset. Set operations become single instructions:

| Set operation | Bitmask expression |
| :--- | :--- |
| Empty set / full set | \`0\` / \`(1 << n) - 1\` |
| Add item i / remove item i | \`S \\| (1 << i)\` / \`S & ~(1 << i)\` |
| Union / intersection | \`A \\| B\` / \`A & B\` |
| Difference A minus B | \`A & ~B\` |
| Is B a subset of A? | \`(B & A) == B\` |
| Size of the set | popcount(S) |

**Enumerate all subsets:** loop \`mask\` from 0 to \`(1 << n) - 1\`; each value is one subset. For n = 3 that is the 8 lines in example 2.

**Enumerate the submasks of one mask:** start at \`sub = mask\` and step with \`sub = (sub - 1) & mask\` until you have processed 0. Subtracting 1 borrows through the clear bits, and \`& mask\` throws away bits outside the mask, so you visit every submask in decreasing order, each exactly once. For \`1011\` that is 8 submasks (2 to the power of its 3 set bits).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 200" role="img" aria-label="Submasks of 1011 in the order the loop visits them: 1011, 1010, 1001, 1000, 0011, 0010, 0001, 0000">
  <defs>
    <marker id="b33q1-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="90" y="58" text-anchor="middle">1011</text>
  <rect class="d-box" x="200" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="260" y="58" text-anchor="middle">1010</text>
  <rect class="d-box" x="370" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="430" y="58" text-anchor="middle">1001</text>
  <rect class="d-box" x="540" y="30" width="120" height="44" rx="8"/>
  <text class="d-text" x="600" y="58" text-anchor="middle">1000</text>
  <path class="d-edge" d="M 152 52 L 194 52" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge" d="M 322 52 L 364 52" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge" d="M 492 52 L 534 52" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge-dashed" d="M 600 76 L 100 124" marker-end="url(#b33q1-a2)"/>
  <rect class="d-box" x="30" y="130" width="120" height="44" rx="8"/>
  <text class="d-text" x="90" y="158" text-anchor="middle">0011</text>
  <rect class="d-box" x="200" y="130" width="120" height="44" rx="8"/>
  <text class="d-text" x="260" y="158" text-anchor="middle">0010</text>
  <rect class="d-box" x="370" y="130" width="120" height="44" rx="8"/>
  <text class="d-text" x="430" y="158" text-anchor="middle">0001</text>
  <rect class="d-box-muted" x="540" y="130" width="120" height="44" rx="8"/>
  <text class="d-text" x="600" y="158" text-anchor="middle">0000</text>
  <path class="d-edge" d="M 152 152 L 194 152" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge" d="M 322 152 L 364 152" marker-end="url(#b33q1-a2)"/>
  <path class="d-edge" d="M 492 152 L 534 152" marker-end="url(#b33q1-a2)"/>
</svg>

Each arrow is one \`sub = (sub - 1) & mask\` step. Bit 2 of the mask is 0, so it never appears in a submask; from 1000, subtracting 1 gives 0111, and \`& 1011\` turns that into 0011.

**The 3^n fact:** if you loop over every mask of n bits and, inside, over all of its submasks, the total work is 3^n, not 4^n, because each item is independently "not in mask", "in mask but not in sub", or "in both". Example 2 counts 59,049 = 3^10 visits for n = 10, against 4^10 = 1,048,576. This bound is what makes many [bitmask DP](/interview-question/what-is-bitmask-dynamic-programming) solutions fast enough.

📌 **Interview term: Bitmask** — an integer used as a set of up to 32 or 64 small items: bit i set means item i is in the set.

📌 **Interview term: Submask** — a mask whose set bits are a subset of another mask's set bits; \`(sub - 1) & mask\` steps through all of them.

## 8. C++ Integers and Bits

C++ gives you the hardware directly, including its sharp edges. The safe rule is simple: **do bit manipulation on unsigned types**, and convert to signed only at the end.

- **Unsigned arithmetic wraps; signed overflow is undefined behaviour.** \`INT_MAX + 1\` on an \`int\` is UB, so the compiler may assume it never happens. Example 3 computes it as \`uint32_t\` and converts: -2147483648.
- **Shifting by the type's width or more is undefined**, even in C++20 (\`1u << 35\` on a 32-bit unsigned). Mask the count (\`1u << (s & 31)\`, as example 3 does) or use a wider type: \`1ULL << 40\`.
- **\`1 << 31\` on a signed \`int\`** produces a value that does not fit in \`int\`; write \`1u << 31\` and cast if you need the signed value.
- **Right-shifting a negative signed value** was implementation-defined before C++20 and is an arithmetic shift from C++20; GCC has always shifted arithmetically, so \`-8 >> 1\` is -4 in our run. For a logical shift, cast to unsigned: \`static_cast<uint32_t>(-8) >> 1\` is 2147483644.
- **\`%\` keeps the dividend's sign:** \`-7 % 2\` is -1. Use \`x & 1\` for parity.
- **Precedence:** \`==\` binds tighter than \`&\`. \`6 & 1 == 0\` compiles (as \`6 & (1 == 0)\`) and printed \`0\` in our run; GCC warns with \`-Wall\` (\`-Wparentheses\`). Write \`(x & 1) == 0\`.
- **Library tools in C++17:** \`std::bitset<N>\` (\`.count()\`, \`.test(i)\`, \`.set(i)\`, \`.to_string()\`) is standard and portable. GCC and Clang also provide \`__builtin_popcount\`, \`__builtin_ctz\` and \`__builtin_clz\` (and \`ll\` versions); per the GCC manual the result of \`__builtin_ctz(0)\` and \`__builtin_clz(0)\` is undefined, so check for zero first. C++20 standardises these in \`<bit>\`: \`std::popcount\`, \`std::countr_zero\`, \`std::has_single_bit\` ([cppreference: std::popcount](https://en.cppreference.com/w/cpp/numeric/popcount)), for unsigned types only. This page sticks to C++17.

📌 **Interview term: Undefined behaviour (UB)** — an operation the C++ standard gives no meaning to, such as signed overflow or an over-wide shift; the compiler may assume it never happens, so the program can do anything.

## 9. The Tricks in C++

~~~cpp
uint32_t x = 44;             // 0b101100, unsigned on purpose
(x >> 3) & 1u;               // 1: bit 3 is set
x | (1u << 4);               // 60: set bit 4
x & ~(1u << 2);              // 40: clear bit 2
x ^ (1u << 0);               // 45: toggle bit 0
x & (~x + 1u);               // 4: lowest set bit (-x on unsigned also works and wraps)
x & (x - 1);                 // 40: lowest set bit cleared
(1u << 3) - 1;               // 7: mask of the low 3 bits

bool isPowerOfTwo(int n) {
    return n > 0 && (n & (n - 1)) == 0;  // parentheses matter: == binds tighter than &
}
~~~

Example 1 uses plain \`int\` for readability, which is fine for these small, positive values; the unsigned forms above are what to write when values can be negative or reach bit 31. For bit 32 and above, \`uint64_t\` and \`1ULL << i\`.

Bitmask subsets in C++:

~~~cpp
for (int mask = 0; mask < (1 << n); mask++)            // n <= 30 with int masks
    for (int i = 0; i < n; i++)
        if ((mask >> i) & 1) { /* item i is in this subset */ }

int sub = mask;                                          // every submask of mask, then 0
while (true) {
    visit(sub);
    if (sub == 0) break;
    sub = (sub - 1) & mask;
}
~~~

## 10. Verified: Running the Code

Each example was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — the single-bit and lowest-bit tricks on x = 44** prints:

~~~text
x                      44  00101100
bit 3 set?            true
bit 4 set?            false
set bit 4              60  00111100
clear bit 2            40  00101000
toggle bit 0           45  00101101
lowest set bit x&-x     4  00000100
drop lowest x&(x-1)    40  00101000
low 3 bits mask         7  00000111
keep low 3 bits         4  00000100
x ^ x                   0  00000000
x ^ 0                  44  00101100
power of two: 0=false, 1=true, 6=false, 64=true, 96=false, -8=false
xor swap: a=9 b=5
~~~

Binary strings come from \`std::bitset<8>(v).to_string()\`. The power-of-two line shows why the \`n > 0\` guard exists.

**Example 2 — bitmasks as sets: all subsets, set operations, submask enumeration and the 3^n count** prints:

~~~text
all subsets of [a, b, c] (mask -> set):
  000 -> {}
  001 -> {a}
  010 -> {b}
  011 -> {a, b}
  100 -> {c}
  101 -> {a, c}
  110 -> {b, c}
  111 -> {a, b, c}
A = {1, 2}, B = {0, 1}
union A|B        = {0, 1, 2}
intersection A&B = {1}
difference A&~B  = {2}
sym diff A^B     = {0, 2}
is B subset of A|B: true
submasks of 1011: 1011 1010 1001 1000 0011 0010 0001 0000
count = 8 = 2^popcount = 8
n=10: submask visits 59049, 3^10 = 59049, 4^10 = 1048576
~~~

The \`2^popcount\` value comes from \`std::bitset<32>(mask).count()\`.

**Example 3 — 32-bit results computed without undefined behaviour** prints:

~~~text
1 << 31 (as int32)      -2147483648
(1 << 31) - 1           2147483647
~0                      -1
-8 >> 1 (arithmetic)    -4
-8 >>> 1 (logical)      2147483644
-1 as unsigned 32-bit   4294967295
popcount(-1), 32 bits   32
INT_MAX + 1 (as int32)  -2147483648
1 << (35 & 31)          8
-7 & 1 (odd test)       1
-7 % 2 != 0 (odd test)  true
~~~

Each line that would be UB written naively (\`1 << 31\`, \`INT_MAX + 1\`, \`1u << 35\`) is computed through \`uint32_t\` and a cast instead.

## Complexity

| Operation | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Test / set / clear / toggle a bit | O(1) | O(1) | one shift and one logic instruction on a machine word |
| \`x & (x - 1)\`, \`x & -x\`, power-of-two test | O(1) | O(1) | one subtraction or negation plus one AND |
| Popcount by Kernighan | O(number of set bits) | O(1) | one loop per 1 bit |
| Enumerate all subsets of n items | O(2^n · n) | O(n) per subset | 2^n masks, n bit tests each |
| Every mask with all its submasks | O(3^n) | O(1) | each item has three states |

The O(1) claims hold for fixed-width machine integers (32 or 64 bits). On arbitrary-size integers (Python \`int\`, \`BigInt\`, \`BigInteger\`) each operation costs time proportional to the number of machine words in the value.

## Edge Cases

- **x = 0:** \`0 & -0 = 0\`, so "lowest set bit" returns 0; the power-of-two test must reject 0 explicitly.
- **Negative x:** the bit pattern is two's complement, so \`-8 & 1\` and \`-7 & 1\` still give the right parity, but "is a power of two" must check \`x > 0\`.
- **The sign bit:** \`1 << 31\` in 32 bits is the most negative int (-2147483648), not 2^31.
- **Shift counts at or beyond the width:** language-dependent; see section 8.
- **Mixed widths:** a mask built in 32 bits cannot reach bit 40; build it in a 64-bit type.

## Common Pitfalls

- **Signed bit tricks that overflow.** \`1 << 31\`, \`INT_MAX + 1\` and \`-INT_MIN\` on \`int\` are not safe; use \`uint32_t\`.
- **\`1 << 40\` with a 32-bit literal.** The literal \`1\` is an \`int\`; shifting it by 40 is UB. Write \`1ULL << 40\`.
- **\`__builtin_ctz(0)\` / \`__builtin_clz(0)\`.** The result is undefined; guard the zero case.
- **Missing parentheses.** \`x & 1 == 0\` compiles and is wrong; compile with \`-Wall\` to get the warning.
- **\`__builtin_popcount\` on a 64-bit value.** It takes \`unsigned int\` and silently truncates; use \`__builtin_popcountll\` or \`std::bitset<64>\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One bit:</strong> <span style="color:#f0e2c8;">Build <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1u &lt;&lt; i</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp;</code> to test, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">|</code> to set, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&amp; ~</code> to clear, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">^</code> to toggle.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Lowest bit:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &amp; (x - 1)</code> clears the lowest 1, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x &amp; -x</code> isolates it; power of two is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &gt; 0 &amp;&amp; (n &amp; (n - 1)) == 0</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. XOR:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ a == 0</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ 0 == a</code>: pairs cancel; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::bitset&lt;32&gt;(a ^ b).count()</code> is the Hamming distance.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Sets:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for (int m = 0; m &lt; 1 &lt;&lt; n; m++)</code> enumerates subsets; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sub = (sub - 1) &amp; mask</code> walks submasks; all masks with all submasks is 3^n.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ safety:</strong> <span style="color:#f0e2c8;">Work in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uint32_t</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uint64_t</code>: signed overflow and shifts by the width or more are undefined. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1ULL &lt;&lt; 40</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::bitset</code>, and guard <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__builtin_ctz(0)</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why prefer unsigned types for bit manipulation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unsigned arithmetic is defined to wrap mod 2^n and right shifts are always logical, while signed overflow is undefined behaviour and the compiler optimises assuming it never happens.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">-8 &gt;&gt; 1</code> guaranteed to be -4?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Since C++20, yes (arithmetic shift). Before that it was implementation-defined; GCC and Clang shift arithmetically, but portable C++17 code casts to unsigned when it wants a specific result.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is wrong with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">1 &lt;&lt; 40</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1</code> is a 32-bit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, and shifting by its width or more is undefined. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1ULL &lt;&lt; 40</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uint64_t{1} &lt;&lt; 40</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which built-ins would you use for popcount and trailing zeros?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Portable C++17: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::bitset&lt;32&gt;(x).count()</code>. GCC/Clang: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__builtin_popcount</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__builtin_ctz</code> (not for 0). C++20: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::popcount</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::countr_zero</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;bit&gt;</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you store a set of 1,000 flags?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::bitset&lt;1000&gt;</code> when the size is known at compile time, otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;bool&gt;</code> (a packed specialisation) or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;uint64_t&gt;</code> you index with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &gt;&gt; 6</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &amp; 63</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Bit / set bit** | A binary digit; a set bit is a 1 |
| **Two's complement** | Signed integers where -x is ~x + 1 and the top bit is the sign |
| **Mask** | A number whose 1 bits mark the positions you want to read or change |
| **Bit shift** | Moving bits left (times 2^k) or right (divide by 2^k) |
| **Lowest set bit (lowbit)** | \`x & -x\`, the rightmost 1 bit of x |
| **Power of two test** | \`x > 0 && (x & (x - 1)) == 0\` |
| **Hamming distance** | Number of differing bits: popcount of \`a ^ b\` |
| **Bitmask** | An integer used as a small set |
| **Submask** | A mask whose bits are a subset of another mask's bits |
| **Undefined behaviour (UB)** | An operation the standard gives no meaning to, such as signed overflow |

---
**Conclusion:** A dozen expressions cover almost every bit question: build a mask with \`1 << i\` to test, set, clear or toggle; use \`x & (x - 1)\` and \`x & -x\` for the lowest set bit and the power-of-two test; use XOR's self-cancelling property for pair problems; and treat an integer as a set to enumerate subsets and submasks. In C++ the extra skill is avoiding undefined behaviour: do the bit work in \`uint32_t\` or \`uint64_t\`, use \`1ULL <<\` for high bits, never shift by the full width, and know \`std::bitset\` plus the compiler built-ins (with their zero-input caveat).`,
        examples: [
          {
            label: `Single-bit and lowest-bit tricks on x = 44`,
            code: `// The core single-bit tricks, applied to x = 44 (binary 00101100).
#include <bitset>
#include <cstdio>
#include <iostream>
#include <string>
#include <vector>

std::string b8(unsigned v) { return std::bitset<8>(v).to_string(); }  // 8-digit binary

void show(const char* name, int v) {
    std::printf("%-22s%3d  %s\\n", name, v, b8(static_cast<unsigned>(v)).c_str());
}

bool isPowerOfTwo(int n) {
    return n > 0 && (n & (n - 1)) == 0;  // parentheses matter: == binds tighter than &
}

int main() {
    std::cout << std::boolalpha;
    int x = 44;
    show("x", x);
    std::printf("%-22s%s\\n", "bit 3 set?", ((x >> 3) & 1) == 1 ? "true" : "false");
    std::printf("%-22s%s\\n", "bit 4 set?", ((x >> 4) & 1) == 1 ? "true" : "false");
    show("set bit 4", x | (1 << 4));
    show("clear bit 2", x & ~(1 << 2));
    show("toggle bit 0", x ^ (1 << 0));
    show("lowest set bit x&-x", x & -x);
    show("drop lowest x&(x-1)", x & (x - 1));
    show("low 3 bits mask", (1 << 3) - 1);
    show("keep low 3 bits", x & ((1 << 3) - 1));
    show("x ^ x", x ^ x);
    show("x ^ 0", x ^ 0);

    std::vector<int> tests = {0, 1, 6, 64, 96, -8};
    std::cout << "power of two: ";
    for (size_t i = 0; i < tests.size(); i++)
        std::cout << (i ? ", " : "") << tests[i] << "=" << isPowerOfTwo(tests[i]);
    std::cout << "\\n";

    // XOR swap works, but std::swap is clearer (and XOR-swapping a variable with itself zeroes it).
    int a = 5, b = 9;
    a ^= b;
    b ^= a;
    a ^= b;
    std::cout << "xor swap: a=" << a << " b=" << b << "\\n";
}`,
          },
          {
            label: `Bitmasks as sets: subsets, set operations, submasks, 3^n`,
            code: `// A bitmask is a set: bit i says whether item i is in the set.
#include <bitset>
#include <iostream>
#include <string>
#include <vector>

std::string members(int m) {
    std::string s = "{";
    bool first = true;
    for (int i = 0; i < 4; i++)
        if ((m >> i) & 1) {
            s += (first ? "" : ", ") + std::to_string(i);
            first = false;
        }
    return s + "}";
}

int main() {
    std::cout << std::boolalpha;
    std::vector<std::string> items = {"a", "b", "c"};
    int n = items.size();
    std::cout << "all subsets of [a, b, c] (mask -> set):\\n";
    for (int mask = 0; mask < (1 << n); mask++) {
        std::string s = "{";
        bool first = true;
        for (int i = 0; i < n; i++)
            if ((mask >> i) & 1) {
                s += (first ? "" : ", ") + items[i];
                first = false;
            }
        std::cout << "  " << std::bitset<3>(mask) << " -> " << s << "}\\n";
    }

    int A = 0b0110;  // {1, 2}
    int B = 0b0011;  // {0, 1}
    std::cout << "A = " << members(A) << ", B = " << members(B) << "\\n";
    std::cout << "union A|B        = " << members(A | B) << "\\n";
    std::cout << "intersection A&B = " << members(A & B) << "\\n";
    std::cout << "difference A&~B  = " << members(A & ~B) << "\\n";
    std::cout << "sym diff A^B     = " << members(A ^ B) << "\\n";
    std::cout << "is B subset of A|B: " << ((B & (A | B)) == B) << "\\n";

    // Walk every submask of 1011 with sub = (sub - 1) & mask.
    int mask = 0b1011;
    std::vector<std::string> subs;
    int sub = mask;
    while (true) {
        subs.push_back(std::bitset<4>(sub).to_string());
        if (sub == 0) break;
        sub = (sub - 1) & mask;
    }
    std::cout << "submasks of 1011:";
    for (auto& s : subs) std::cout << " " << s;
    std::cout << "\\ncount = " << subs.size() << " = 2^popcount = " << (1 << std::bitset<32>(mask).count()) << "\\n";

    // Summing over all masks of all their submasks costs 3^n, not 4^n.
    long long total = 0;
    for (int m = 0; m < (1 << 10); m++) {
        int s = m;
        while (true) {
            total++;
            if (s == 0) break;
            s = (s - 1) & m;
        }
    }
    long long pow3 = 1;
    for (int i = 0; i < 10; i++) pow3 *= 3;
    std::cout << "n=10: submask visits " << total << ", 3^10 = " << pow3 << ", 4^10 = " << (1 << 20) << "\\n";
}`,
          },
          {
            label: `32-bit results without undefined behaviour`,
            code: `// C++ signed overflow and over-wide shifts are undefined behaviour, so the
// safe way to do bit tricks is on unsigned (uint32_t) values, converting back.
#include <bitset>
#include <cstdint>
#include <cstdio>

void row(const char* label, long long v) { std::printf("%-24s%lld\\n", label, v); }

int main() {
    row("1 << 31 (as int32)", static_cast<int32_t>(1u << 31));
    row("(1 << 31) - 1", static_cast<int32_t>((1u << 31) - 1u));
    row("~0", ~0);
    row("-8 >> 1 (arithmetic)", -8 >> 1);  // implementation-defined before C++20; GCC shifts arithmetically
    row("-8 >>> 1 (logical)", static_cast<uint32_t>(-8) >> 1);
    row("-1 as unsigned 32-bit", static_cast<uint32_t>(-1));
    row("popcount(-1), 32 bits", std::bitset<32>(static_cast<uint32_t>(-1)).count());
    row("INT_MAX + 1 (as int32)", static_cast<int32_t>(static_cast<uint32_t>(INT32_MAX) + 1u));
    unsigned shift = 35;
    row("1 << (35 & 31)", static_cast<int32_t>(1u << (shift & 31)));  // 1u << 35 itself is UB
    row("-7 & 1 (odd test)", -7 & 1);
    std::printf("%-24s%s\\n", "-7 % 2 != 0 (odd test)", -7 % 2 != 0 ? "true" : "false");  // -7 % 2 is -1 in C++
}`,
          },
        ],
      },
    },
  },
  {
    title: `How do you count the number of set bits in an integer?`,
    difficulty: "medium",
    seoDescription: `Count set bits four ways: bit-by-bit, Kernighan's n & (n-1), lookup table and SWAR, plus the 0..n DP, in Python, JavaScript, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Write a Python function that returns the number of 1 bits in an integer. Start simple, then make it faster, and tell me what your function returns for a negative number."

**What a strong answer should cover:**
- The naive loop over 32 bit positions, then Brian Kernighan's \`n &= n - 1\`, which runs once per set bit.
- Constant-time options: a 256-entry byte table, or the parallel SWAR additions.
- Complexity: O(32) vs O(number of set bits) vs O(1), and the O(n) DP \`bits[i] = bits[i >> 1] + (i & 1)\` for every number 0..n.
- Python details: \`int.bit_count()\` (Python 3.10+) and \`bin(n).count("1")\`; Python ints are unbounded, so a negative number has no fixed bit pattern: \`while n: n &= n - 1\` never ends for negative n, and you mask with \`n & 0xFFFFFFFF\` to get the 32-bit answer.

**Clarifying questions expected:**
- How should negative numbers be treated: as 32-bit two's complement, or by magnitude?
- Is this one call, or many calls (or every number up to n)?

**Code / implementation expected:** Yes — Kernighan's loop in Python 3 with a 32-bit mask, plus the built-in \`int.bit_count()\`.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know loops and integers in Python; binary is explained as we go.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A night guard walks past an office tower and wants to know how many windows are lit. The slow way is to look at every single window, lit or dark, floor by floor. A sharper guard notices a pattern: if he could jump straight from one lit window to the next and skip the dark ones, the walk would take as many steps as there are lights, not as many as there are windows.

An integer is that tower: 32 (or 64) windows, each bit lit (1) or dark (0). "Count the set bits" means count the lit windows. The slow walk checks all 32 positions. The sharp guard's shortcut is one line of code, \`n & (n - 1)\`, which jumps straight past the lowest lit window. Faster still, you can count several windows at once with a lookup table, or count all of them in parallel with a few clever additions.

The question is a favourite because it has a ladder of answers (32 steps, then "one step per 1 bit", then constant time) and because it tests whether you know how your language stores negative numbers. It is also used everywhere in real code: Hamming distance, bitmask DP (how many items are in this set?), chess engines, and compression.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Signed or unsigned? What should a negative number return? | For -1, the 32-bit answer is 32 (all ones). Some languages need an explicit conversion to get that. |
| 32-bit or 64-bit? | The naive loop runs 32 or 64 times; masks in the parallel method change. |
| Is the function called once, or millions of times? | Many calls justify a lookup table or the built-in; one call does not. |
| Do you want the count for one number, or for every number from 0 to n? | The second is a different problem with an O(n) DP answer (section 8). |
| May I use the language's built-in? | Usually yes in practice; in an interview, show the manual method first, then name the built-in. |

## 3. What Exactly Are We Counting?

The **population count** (popcount) of a number is how many 1s appear in its binary form. 12 is \`1100\`, popcount 2. 255 is \`11111111\`, popcount 8. 2147483647, the largest 32-bit signed int, is 31 ones.

📌 **Interview term: Popcount / Hamming weight** — the number of 1 bits in an integer's binary representation. 'Count the set bits', 'number of 1 bits' and 'Hamming weight' all mean the same thing.

For negative numbers we count the bits of the **two's complement** pattern: -1 is 32 ones in a 32-bit int, so its popcount is 32; -8 is \`11111111111111111111111111111000\`, popcount 29.

📌 **Interview term: Two's complement** — the standard way signed integers are stored: -x is \`~x + 1\`, so -1 is all ones and the top bit is the sign bit.

## 4. Four Ways to Count, from Slowest to Fastest

### 4.1 Check every bit — O(w)

Look at the lowest bit with \`n & 1\`, add it to the count, shift \`n\` right by one, and repeat for all w bit positions (w = 32). Simple and always correct, but it does 32 steps even for the number 1.

### 4.2 Brian Kernighan's trick — O(number of set bits)

\`n & (n - 1)\` turns off the lowest set bit of n. Subtracting 1 flips the lowest 1 to 0 and turns every 0 below it into 1; AND-ing with the original then wipes all of those positions and leaves the higher bits alone. Repeat until n is 0 and count the steps: the loop runs once per set bit.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Kernighan steps on 44: 101100 becomes 101000, then 100000, then 000000; three steps means three set bits">
  <defs>
    <marker id="b33q2-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="250" height="50" rx="8"/>
  <text class="d-text" x="165" y="61" text-anchor="middle">n = 101100 (44)</text>
  <path class="d-edge" d="M 292 55 L 424 55" marker-end="url(#b33q2-a1)"/>
  <text class="d-sub" x="358" y="40" text-anchor="middle">n &amp; (n - 1)</text>
  <rect class="d-box" x="430" y="30" width="250" height="50" rx="8"/>
  <text class="d-text" x="555" y="61" text-anchor="middle">101000 (40), count 1</text>
  <path class="d-edge" d="M 555 82 L 555 124" marker-end="url(#b33q2-a1)"/>
  <rect class="d-box" x="430" y="130" width="250" height="50" rx="8"/>
  <text class="d-text" x="555" y="161" text-anchor="middle">100000 (32), count 2</text>
  <path class="d-edge" d="M 428 155 L 296 155" marker-end="url(#b33q2-a1)"/>
  <text class="d-sub" x="358" y="140" text-anchor="middle">n &amp; (n - 1)</text>
  <rect class="d-box-accent" x="40" y="130" width="250" height="50" rx="8"/>
  <text class="d-text" x="165" y="161" text-anchor="middle">000000, count 3</text>
  <text class="d-sub" x="165" y="215" text-anchor="middle">n is 0: stop</text>
</svg>

Each arrow removes exactly one 1 bit, so 44, which has three set bits, takes three steps instead of 32. For sparse numbers (few 1s) this is a big win; for -1 it is no better than the naive loop (32 steps).

📌 **Interview term: Brian Kernighan's algorithm** — count set bits by repeating \`n &= n - 1\` until n is 0; the number of iterations is the popcount.

### 4.3 Lookup table — O(w / 8)

Precompute the popcount of every byte value 0..255 once (256 small numbers), then split the integer into 4 bytes and add 4 table entries. The table itself is built with the same idea as the DP in section 8: \`table[i] = table[i >> 1] + (i & 1)\`. Trades 256 bytes of memory for a fixed 4 lookups.

### 4.4 Parallel (SWAR) counting — O(log w)

Instead of counting bits one by one, add them up in parallel inside the register. First every pair of bits is replaced by its own count (0, 1 or 2), then neighbouring pairs are added into 4-bit fields, then into bytes, and a final multiply adds the four bytes together. Five lines, no loop, no table:

| Step | Expression | 44 (8 bits shown) | Meaning |
| :--- | :--- | :--- | :--- |
| start | \`n\` | \`00 10 11 00\` | 4 pairs of bits |
| 2-bit counts | \`n - ((n >> 1) & 0x55555555)\` | \`00 01 10 00\` | pairs now hold 0, 1, 2, 0 |
| 4-bit counts | \`(n & 0x33333333) + ((n >> 2) & 0x33333333)\` | \`0001 0010\` | nibbles hold 1 and 2 |
| byte counts | \`(n + (n >> 4)) & 0x0F0F0F0F\` | \`00000011\` | the byte holds 3 |
| total | \`(n * 0x01010101) >> 24\` (32-bit) | 3 | sums all four bytes into the top byte |

📌 **Interview term: SWAR (SIMD within a register)** — treating one machine word as several small fields and operating on all of them at once with ordinary arithmetic and masks.

### 4.5 The built-in

Every language in this guide has a library way to do it (section 6). Use it in production code; library and compiler implementations can use dedicated CPU instructions where the hardware has them. In an interview, show Kernighan's method, mention the table and SWAR as faster constant-time options, and then name the built-in.

## 5. Negative Numbers in Python

Python's \`int\` has no fixed width. A negative int behaves as if it had *infinitely many* 1 bits on the left, so "how many 1 bits does -1 have?" has no finite answer until you choose a width. Two consequences:

- **Kernighan's loop never ends on a negative int.** \`-8 & -9\` is -16, then -32, and so on: the value grows more negative and never reaches 0. Always mask first: \`n &= 0xFFFFFFFF\` turns any int into its unsigned 32-bit pattern (-1 becomes 4294967295).
- **The built-ins count the magnitude, not the pattern.** \`int.bit_count()\` returns the number of ones in the binary representation of the *absolute value* ([Python docs: int.bit_count](https://docs.python.org/3/library/stdtypes.html#int.bit_count)), and \`bin(-8)\` is \`'-0b1000'\`. In our run, \`(-8).bit_count()\` printed 1, while the 32-bit answer is 29. Mask first if the problem means 32-bit integers: \`(n & 0xFFFFFFFF).bit_count()\`.

## 6. The Code in Python

~~~python
MASK32 = 0xFFFFFFFF


def kernighan(n):
    """n & (n - 1) clears the lowest 1 bit, so loop once per 1 bit."""
    n &= MASK32
    count = loops = 0
    while n:
        n &= n - 1
        count += 1
        loops += 1
    return count, loops
~~~

The example returns the number of loop iterations too, to show they equal the count. The other methods from section 4, as written in example 1:

~~~python
def swar(n):
    """Add bits in parallel: pairs, then nibbles, then bytes."""
    n &= MASK32
    n = n - ((n >> 1) & 0x55555555)
    n = (n & 0x33333333) + ((n >> 2) & 0x33333333)
    n = (n + (n >> 4)) & 0x0F0F0F0F
    return ((n * 0x01010101) & MASK32) >> 24
~~~

**What to point out in this code:**

- \`n &= MASK32\` on the first line is what makes negatives terminate and gives the 32-bit answer.
- In \`swar\`, Python's multiplication does not wrap at 32 bits, so the result is masked with \`& MASK32\` before the final shift. In C, Java or JavaScript's \`Math.imul\` the wrap is automatic.
- **The built-in:** \`n.bit_count()\` exists from Python 3.10 ([docs](https://docs.python.org/3/library/stdtypes.html#int.bit_count)); \`bin(n).count("1")\` works on every version. Both count the magnitude for negatives, as above.
- Python ints are objects, so all four hand-written methods are much slower than \`bit_count()\`, which runs in C. In an interview write Kernighan, then say you would use \`bit_count()\` in real code.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — naive, Kernighan, byte table, SWAR and the built-in on nine values** prints:

~~~text
          0: naive  0, kernighan  0 ( 0 loops), table  0, swar  0, builtin  0
          1: naive  1, kernighan  1 ( 1 loops), table  1, swar  1, builtin  1
          7: naive  3, kernighan  3 ( 3 loops), table  3, swar  3, builtin  3
         12: naive  2, kernighan  2 ( 2 loops), table  2, swar  2, builtin  2
        255: naive  8, kernighan  8 ( 8 loops), table  8, swar  8, builtin  8
       1024: naive  1, kernighan  1 ( 1 loops), table  1, swar  1, builtin  1
 2147483647: naive 31, kernighan 31 (31 loops), table 31, swar 31, builtin 31
         -1: naive 32, kernighan 32 (32 loops), table 32, swar 32, builtin 32
         -8: naive 29, kernighan 29 (29 loops), table 29, swar 29, builtin 29
~~~

All five agree on every value, and Kernighan's loop count equals the popcount. The -1 and -8 rows use the 32-bit mask; \`(-8).bit_count()\` without it would print 1.

**Example 2 — the 0..n DP, checked against the library and with work counters** prints:

~~~text
0..16: [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4, 1]
N = 100000
total 1 bits (dp)         815030
dp == lowbit version:     true
matches library count:    true
naive steps   (32 per i)  3200032
kernighan steps           815030
dp steps      (1 per i)   100000
max popcount in 0..N      16 at 65535
~~~

The two DP formulas agree everywhere, and the largest popcount below 100,000 is 16, at 65535 = 2^16 - 1.

## 8. Follow-Up: Count the Bits of Every Number from 0 to n

Calling popcount on each number separately costs O(n · w), or O(total set bits) with Kernighan. But each answer can be built from a smaller one you already have:

- **Drop the last bit:** \`i >> 1\` is i without its last bit, so \`bits[i] = bits[i >> 1] + (i & 1)\`.
- **Drop the lowest set bit:** \`i & (i - 1)\` is i with one fewer 1, so \`bits[i] = bits[i & (i - 1)] + 1\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="bits of 13 equals bits of 6 plus the last bit 1: 1101 is 110 followed by 1, so 3 equals 2 plus 1">
  <defs>
    <marker id="b33q2-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="40" width="200" height="70" rx="10"/>
  <text class="d-text" x="140" y="70" text-anchor="middle">i = 13</text>
  <text class="d-sub" x="140" y="94" text-anchor="middle">1101</text>
  <path class="d-edge" d="M 242 75 L 314 75" marker-end="url(#b33q2-a2)"/>
  <text class="d-sub" x="278" y="60" text-anchor="middle">i &gt;&gt; 1</text>
  <rect class="d-box" x="320" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="400" y="70" text-anchor="middle">6</text>
  <text class="d-sub" x="400" y="94" text-anchor="middle">110, bits 2</text>
  <rect class="d-box" x="540" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="610" y="70" text-anchor="middle">i &amp; 1</text>
  <text class="d-sub" x="610" y="94" text-anchor="middle">last bit 1</text>
  <path class="d-edge" d="M 400 112 L 400 154" marker-end="url(#b33q2-a2)"/>
  <path class="d-edge" d="M 610 112 L 470 158" marker-end="url(#b33q2-a2)"/>
  <rect class="d-box-muted" x="260" y="160" width="280" height="44" rx="8"/>
  <text class="d-text" x="400" y="188" text-anchor="middle">bits[13] = 2 + 1 = 3</text>
</svg>

Because \`i >> 1 < i\`, the smaller answer is always ready when you need it, so one left-to-right pass fills the whole table in O(n). This is a tiny example of [dynamic programming](/interview-question/what-is-dynamic-programming). Example 2 builds the table for 0..100,000 both ways, checks it against the library popcount, and counts the work: 3,200,032 steps for the naive loop, 815,030 for Kernighan (one per set bit), and 100,000 for the DP.

In Python:

~~~python
def count_bits_dp(n):
    """bits[i] = bits[i >> 1] + (i & 1): i without its last bit, plus that bit."""
    bits = [0] * (n + 1)
    for i in range(1, n + 1):
        bits[i] = bits[i >> 1] + (i & 1)
    return bits
~~~

## 9. Complexity

| Method | Time per number | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Check every bit | O(w), w = 32 or 64 | O(1) | one step per bit position |
| Kernighan | O(k), k = set bits | O(1) | one step per 1 bit |
| Byte lookup table | O(w / 8) | O(256) | 4 lookups for 32 bits |
| SWAR | O(log w) | O(1) | 5 operations for 32 bits, 6 for 64 |
| Built-in | O(1) in practice | O(1) | library code or a CPU instruction |
| All of 0..n by DP | O(n) total | O(n) | one addition per number |

Since w is fixed (32 or 64), every per-number method is technically O(1); the table above shows how the work scales with the word size and the number of 1 bits, which is what interviewers want to hear.

## Edge Cases

- **0:** popcount 0; Kernighan's loop does not run at all.
- **1 and powers of two:** popcount 1; Kernighan stops after one step, the naive loop still does 32.
- **The largest positive int (2147483647):** 31.
- **-1:** all ones, 32 in 32-bit arithmetic (64 in 64-bit). This is where languages differ; see section 5.
- **Other negatives:** -8 is 29 in 32 bits. Decide with the interviewer whether you want the 32-bit pattern or the magnitude.
- **64-bit values:** every mask in the SWAR method doubles in width and the final shift becomes 56.

## Common Pitfalls

- **Running Kernighan's loop on a negative int.** It never terminates in Python; mask with \`0xFFFFFFFF\` first.
- **Trusting \`bit_count()\` or \`bin()\` for negatives.** They count \`abs(n)\`: \`(-8).bit_count()\` is 1, not 29.
- **\`bit_count()\` on old Python.** It was added in 3.10; on older versions use \`bin(n).count("1")\`.
- **Forgetting to mask the SWAR multiply.** Without \`& MASK32\`, the product keeps growing and \`>> 24\` returns garbage.
- **Using \`n >> 1\` in a loop that waits for 0 on negatives.** \`-1 >> 1\` is still -1 in Python, so the loop never ends.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define:</strong> <span style="color:#f0e2c8;">Popcount is the number of 1 bits; for negatives, agree on the 32-bit two's complement pattern.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Simple:</strong> <span style="color:#f0e2c8;">Check each of the 32 bits with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &amp; 1</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &gt;&gt;= 1</code>: always 32 steps.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Kernighan:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &amp;= n - 1</code> clears the lowest 1, so the loop runs once per set bit; mask with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0xFFFFFFFF</code> first in Python.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Faster:</strong> <span style="color:#f0e2c8;">A 256-entry byte table (4 lookups) or SWAR (5 operations), both constant time for 32 bits.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python:</strong> <span style="color:#f0e2c8;">In real code use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n.bit_count()</code> (3.10+) or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bin(n).count('1')</code>; both count <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abs(n)</code> for negatives.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does your loop hang for -1 in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Python ints have no fixed width, so -1 has infinitely many 1 bits and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &amp; (n - 1)</code> never reaches 0. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &amp;= 0xFFFFFFFF</code> fixes it and gives 32.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Count the bits of every number from 0 to n.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">DP: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bits[i] = bits[i &gt;&gt; 1] + (i &amp; 1)</code>, one pass, O(n). Example 2 checks it against <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bit_count()</code> for 0..100,000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the Hamming distance between two integers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The popcount of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ b</code>, because XOR has a 1 exactly where they differ: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(a ^ b).bit_count()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which method is fastest in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The built-in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bit_count()</code>, because it runs in C. Hand-written loops pay interpreter overhead per step, so the asymptotically better SWAR is not faster than the built-in in pure Python.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle 64-bit values?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mask with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0xFFFFFFFFFFFFFFFF</code>, double every SWAR mask, multiply by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0x0101010101010101</code> and shift right by 56.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Popcount / Hamming weight** | Number of 1 bits in a value |
| **Two's complement** | Signed integer encoding: -x is ~x + 1 |
| **Brian Kernighan's algorithm** | Repeat \`n &= n - 1\`; the iteration count is the popcount |
| **SWAR (SIMD within a register)** | Treat one word as several small fields and add them in parallel |

---
**Conclusion:** Counting set bits has a ladder of answers: check all 32 positions, then Kernighan's \`n &= n - 1\` which costs one step per 1 bit, then constant-time byte tables or SWAR, and for every number up to n a one-pass DP. In Python the decisive detail is that ints are unbounded: mask with \`0xFFFFFFFF\` before looping, and know that \`bit_count()\` (3.10+) and \`bin().count("1")\` count the magnitude of a negative number rather than its 32-bit pattern.`,
        examples: [
          {
            label: `Naive vs Kernighan vs table vs SWAR vs built-in`,
            code: `# Four ways to count the 1 bits of a 32-bit value, plus the built-in.
MASK32 = 0xFFFFFFFF


def naive(n):
    """Look at every one of the 32 bit positions."""
    n &= MASK32  # treat negatives as their 32-bit two's complement pattern
    count = 0
    for _ in range(32):
        count += n & 1
        n >>= 1
    return count


def kernighan(n):
    """n & (n - 1) clears the lowest 1 bit, so loop once per 1 bit."""
    n &= MASK32
    count = loops = 0
    while n:
        n &= n - 1
        count += 1
        loops += 1
    return count, loops


TABLE = [0] * 256  # popcount of every byte, built from the previous entries
for i in range(1, 256):
    TABLE[i] = TABLE[i >> 1] + (i & 1)


def by_table(n):
    n &= MASK32
    return TABLE[n & 0xFF] + TABLE[(n >> 8) & 0xFF] + TABLE[(n >> 16) & 0xFF] + TABLE[n >> 24]


def swar(n):
    """Add bits in parallel: pairs, then nibbles, then bytes."""
    n &= MASK32
    n = n - ((n >> 1) & 0x55555555)
    n = (n & 0x33333333) + ((n >> 2) & 0x33333333)
    n = (n + (n >> 4)) & 0x0F0F0F0F
    return ((n * 0x01010101) & MASK32) >> 24


for n in [0, 1, 7, 12, 255, 1024, 2147483647, -1, -8]:
    k, loops = kernighan(n)
    builtin = (n & MASK32).bit_count()  # Python 3.10+; bin(x).count("1") on older versions
    print(str(n).rjust(11) + ": naive " + str(naive(n)).rjust(2) + ", kernighan " + str(k).rjust(2)
          + " (" + str(loops).rjust(2) + " loops), table " + str(by_table(n)).rjust(2)
          + ", swar " + str(swar(n)).rjust(2) + ", builtin " + str(builtin).rjust(2))`,
          },
          {
            label: `Bits of every number 0..n with DP, and work counters`,
            code: `# Follow-up: popcount of every number 0..n. Reuse answers you already have.


def count_bits_dp(n):
    """bits[i] = bits[i >> 1] + (i & 1): i without its last bit, plus that bit."""
    bits = [0] * (n + 1)
    for i in range(1, n + 1):
        bits[i] = bits[i >> 1] + (i & 1)
    return bits


def count_bits_lowbit(n):
    """bits[i] = bits[i & (i - 1)] + 1: i without its lowest 1 bit, plus one."""
    bits = [0] * (n + 1)
    for i in range(1, n + 1):
        bits[i] = bits[i & (i - 1)] + 1
    return bits


print("0..16: [" + ", ".join(str(b) for b in count_bits_dp(16)) + "]")

N = 100000
dp = count_bits_dp(N)
lowbit = count_bits_lowbit(N)

# Work done by the per-number methods over 0..N.
naive_steps = 32 * (N + 1)
kern_steps = 0
for i in range(N + 1):
    v = i
    while v:
        v &= v - 1
        kern_steps += 1

print("N = " + str(N))
print("total 1 bits (dp)         " + str(sum(dp)))
print("dp == lowbit version:     " + str(dp == lowbit).lower())
print("matches library count:    " + str(all(dp[i] == bin(i).count("1") for i in range(N + 1))).lower())
print("naive steps   (32 per i)  " + str(naive_steps))
print("kernighan steps           " + str(kern_steps))
print("dp steps      (1 per i)   " + str(N))
print("max popcount in 0..N      " + str(max(dp)) + " at " + str(dp.index(max(dp))))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Write a JavaScript function that returns the number of 1 bits in an integer. Start simple, then make it faster, and tell me what it returns for a negative number."

**What a strong answer should cover:**
- The naive loop over 32 bit positions, then Brian Kernighan's \`n &= n - 1\`, which runs once per set bit.
- Constant-time options: a 256-entry byte table (\`Uint8Array\`), or the parallel SWAR additions.
- Complexity: O(32) vs O(number of set bits) vs O(1), and the O(n) DP for every number 0..n.
- JavaScript details: bitwise operators work on 32-bit signed integers, so negatives automatically use their two's complement pattern; use \`>>>\` (not \`>>\`) in the naive loop; use \`Math.imul\` for the SWAR multiply; there is no built-in popcount, and \`(n >>> 0).toString(2)\` is the string-based fallback.

**Clarifying questions expected:**
- Should negative numbers count their 32-bit two's complement bits?
- Are values guaranteed to fit in 32 bits?

**Code / implementation expected:** Yes — Kernighan's loop in JavaScript, plus the SWAR or table version.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know loops and integers in JavaScript; binary is explained as we go.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A night guard walks past an office tower and wants to know how many windows are lit. The slow way is to look at every single window, lit or dark, floor by floor. A sharper guard notices a pattern: if he could jump straight from one lit window to the next and skip the dark ones, the walk would take as many steps as there are lights, not as many as there are windows.

An integer is that tower: 32 (or 64) windows, each bit lit (1) or dark (0). "Count the set bits" means count the lit windows. The slow walk checks all 32 positions. The sharp guard's shortcut is one line of code, \`n & (n - 1)\`, which jumps straight past the lowest lit window. Faster still, you can count several windows at once with a lookup table, or count all of them in parallel with a few clever additions.

The question is a favourite because it has a ladder of answers (32 steps, then "one step per 1 bit", then constant time) and because it tests whether you know how your language stores negative numbers. It is also used everywhere in real code: Hamming distance, bitmask DP (how many items are in this set?), chess engines, and compression.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Signed or unsigned? What should a negative number return? | For -1, the 32-bit answer is 32 (all ones). Some languages need an explicit conversion to get that. |
| 32-bit or 64-bit? | The naive loop runs 32 or 64 times; masks in the parallel method change. |
| Is the function called once, or millions of times? | Many calls justify a lookup table or the built-in; one call does not. |
| Do you want the count for one number, or for every number from 0 to n? | The second is a different problem with an O(n) DP answer (section 8). |
| May I use the language's built-in? | Usually yes in practice; in an interview, show the manual method first, then name the built-in. |

## 3. What Exactly Are We Counting?

The **population count** (popcount) of a number is how many 1s appear in its binary form. 12 is \`1100\`, popcount 2. 255 is \`11111111\`, popcount 8. 2147483647, the largest 32-bit signed int, is 31 ones.

📌 **Interview term: Popcount / Hamming weight** — the number of 1 bits in an integer's binary representation. 'Count the set bits', 'number of 1 bits' and 'Hamming weight' all mean the same thing.

For negative numbers we count the bits of the **two's complement** pattern: -1 is 32 ones in a 32-bit int, so its popcount is 32; -8 is \`11111111111111111111111111111000\`, popcount 29.

📌 **Interview term: Two's complement** — the standard way signed integers are stored: -x is \`~x + 1\`, so -1 is all ones and the top bit is the sign bit.

## 4. Four Ways to Count, from Slowest to Fastest

### 4.1 Check every bit — O(w)

Look at the lowest bit with \`n & 1\`, add it to the count, shift \`n\` right by one, and repeat for all w bit positions (w = 32). Simple and always correct, but it does 32 steps even for the number 1.

### 4.2 Brian Kernighan's trick — O(number of set bits)

\`n & (n - 1)\` turns off the lowest set bit of n. Subtracting 1 flips the lowest 1 to 0 and turns every 0 below it into 1; AND-ing with the original then wipes all of those positions and leaves the higher bits alone. Repeat until n is 0 and count the steps: the loop runs once per set bit.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Kernighan steps on 44: 101100 becomes 101000, then 100000, then 000000; three steps means three set bits">
  <defs>
    <marker id="b33q2-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="250" height="50" rx="8"/>
  <text class="d-text" x="165" y="61" text-anchor="middle">n = 101100 (44)</text>
  <path class="d-edge" d="M 292 55 L 424 55" marker-end="url(#b33q2-a1)"/>
  <text class="d-sub" x="358" y="40" text-anchor="middle">n &amp; (n - 1)</text>
  <rect class="d-box" x="430" y="30" width="250" height="50" rx="8"/>
  <text class="d-text" x="555" y="61" text-anchor="middle">101000 (40), count 1</text>
  <path class="d-edge" d="M 555 82 L 555 124" marker-end="url(#b33q2-a1)"/>
  <rect class="d-box" x="430" y="130" width="250" height="50" rx="8"/>
  <text class="d-text" x="555" y="161" text-anchor="middle">100000 (32), count 2</text>
  <path class="d-edge" d="M 428 155 L 296 155" marker-end="url(#b33q2-a1)"/>
  <text class="d-sub" x="358" y="140" text-anchor="middle">n &amp; (n - 1)</text>
  <rect class="d-box-accent" x="40" y="130" width="250" height="50" rx="8"/>
  <text class="d-text" x="165" y="161" text-anchor="middle">000000, count 3</text>
  <text class="d-sub" x="165" y="215" text-anchor="middle">n is 0: stop</text>
</svg>

Each arrow removes exactly one 1 bit, so 44, which has three set bits, takes three steps instead of 32. For sparse numbers (few 1s) this is a big win; for -1 it is no better than the naive loop (32 steps).

📌 **Interview term: Brian Kernighan's algorithm** — count set bits by repeating \`n &= n - 1\` until n is 0; the number of iterations is the popcount.

### 4.3 Lookup table — O(w / 8)

Precompute the popcount of every byte value 0..255 once (256 small numbers), then split the integer into 4 bytes and add 4 table entries. The table itself is built with the same idea as the DP in section 8: \`table[i] = table[i >> 1] + (i & 1)\`. Trades 256 bytes of memory for a fixed 4 lookups.

### 4.4 Parallel (SWAR) counting — O(log w)

Instead of counting bits one by one, add them up in parallel inside the register. First every pair of bits is replaced by its own count (0, 1 or 2), then neighbouring pairs are added into 4-bit fields, then into bytes, and a final multiply adds the four bytes together. Five lines, no loop, no table:

| Step | Expression | 44 (8 bits shown) | Meaning |
| :--- | :--- | :--- | :--- |
| start | \`n\` | \`00 10 11 00\` | 4 pairs of bits |
| 2-bit counts | \`n - ((n >> 1) & 0x55555555)\` | \`00 01 10 00\` | pairs now hold 0, 1, 2, 0 |
| 4-bit counts | \`(n & 0x33333333) + ((n >> 2) & 0x33333333)\` | \`0001 0010\` | nibbles hold 1 and 2 |
| byte counts | \`(n + (n >> 4)) & 0x0F0F0F0F\` | \`00000011\` | the byte holds 3 |
| total | \`(n * 0x01010101) >> 24\` (32-bit) | 3 | sums all four bytes into the top byte |

📌 **Interview term: SWAR (SIMD within a register)** — treating one machine word as several small fields and operating on all of them at once with ordinary arithmetic and masks.

### 4.5 The built-in

Every language in this guide has a library way to do it (section 6). Use it in production code; library and compiler implementations can use dedicated CPU instructions where the hardware has them. In an interview, show Kernighan's method, mention the table and SWAR as faster constant-time options, and then name the built-in.

## 5. Negative Numbers in JavaScript

JavaScript bitwise operators convert their operands to 32-bit signed integers before they work ([MDN: Bitwise AND](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_AND)). For popcount that is convenient: a negative number automatically becomes its 32-bit two's complement pattern, so Kernighan's loop on -1 runs exactly 32 times and returns 32 with no extra code.

Two places still need care:

- **Right shift.** \`>>\` copies the sign bit in, so \`-1 >> 1\` is still -1 and a loop waiting for 0 never ends. Use \`>>>\`, which shifts in zeros and returns an unsigned value.
- **Values outside 32 bits.** A Number above 2^31 loses its high bits as soon as it meets \`&\`: \`(2 ** 32 + 5) | 0\` is 5 in our run. For 64-bit values, use \`BigInt\` and a BigInt version of the loop (\`n &= n - 1n\`), which only terminates for non-negative BigInts; for a negative one, first take \`BigInt.asUintN(64, n)\`.

## 6. The Code in JavaScript

~~~javascript
function kernighan(n) {
  // n & (n - 1) clears the lowest 1 bit, so loop once per 1 bit.
  let count = 0, loops = 0;
  while (n !== 0) {
    n &= n - 1; // works on the int32 pattern, so negatives are fine
    count++;
    loops++;
  }
  return [count, loops];
}
~~~

The example returns the number of loop iterations too, to show they equal the count. The SWAR version from section 4:

~~~javascript
function swar(n) {
  // Add bits in parallel: pairs, then nibbles, then bytes.
  n = n - ((n >>> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
  n = (n + (n >>> 4)) & 0x0f0f0f0f;
  return Math.imul(n, 0x01010101) >>> 24; // Math.imul: 32-bit multiply, no float rounding
}
~~~

**What to point out in this code:**

- Kernighan needs no conversion: \`n & (n - 1)\` already works on the int32 pattern, and for -1 the result reaches 0 after 32 steps.
- In \`swar\`, every right shift is \`>>>\` so no sign bits leak in, and the multiply uses \`Math.imul\`, which multiplies as 32-bit integers and keeps the low 32 bits, the same as C or Java would. Here a plain \`*\` happens to work too (each byte holds at most 8, so the product stays below 2^53 and \`>>> 24\` then wraps it correctly), but a general 32-bit by 32-bit product can exceed 2^53 and lose low bits, so \`Math.imul\` is the habit to show.
- The byte table is a \`Uint8Array(256)\`, which is zero-initialised and stores real bytes, not boxed numbers.
- **No built-in popcount.** \`(n >>> 0).toString(2).split('1').length - 1\` counts via a string; it is correct (example 1 uses it as the "builtin" column) but allocates a string per call, so it is the slowest option.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — naive, Kernighan, byte table, SWAR and the string-based count on nine values** prints:

~~~text
          0: naive  0, kernighan  0 ( 0 loops), table  0, swar  0, builtin  0
          1: naive  1, kernighan  1 ( 1 loops), table  1, swar  1, builtin  1
          7: naive  3, kernighan  3 ( 3 loops), table  3, swar  3, builtin  3
         12: naive  2, kernighan  2 ( 2 loops), table  2, swar  2, builtin  2
        255: naive  8, kernighan  8 ( 8 loops), table  8, swar  8, builtin  8
       1024: naive  1, kernighan  1 ( 1 loops), table  1, swar  1, builtin  1
 2147483647: naive 31, kernighan 31 (31 loops), table 31, swar 31, builtin 31
         -1: naive 32, kernighan 32 (32 loops), table 32, swar 32, builtin 32
         -8: naive 29, kernighan 29 (29 loops), table 29, swar 29, builtin 29
~~~

All five agree on every value, and Kernighan's loop count equals the popcount. The -1 and -8 rows need no conversion, because bitwise operators already see the 32-bit pattern.

**Example 2 — the 0..n DP, checked against the string-based count and with work counters** prints:

~~~text
0..16: [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4, 1]
N = 100000
total 1 bits (dp)         815030
dp == lowbit version:     true
matches library count:    true
naive steps   (32 per i)  3200032
kernighan steps           815030
dp steps      (1 per i)   100000
max popcount in 0..N      16 at 65535
~~~

The two DP formulas agree everywhere, and the largest popcount below 100,000 is 16, at 65535 = 2^16 - 1.

## 8. Follow-Up: Count the Bits of Every Number from 0 to n

Calling popcount on each number separately costs O(n · w), or O(total set bits) with Kernighan. But each answer can be built from a smaller one you already have:

- **Drop the last bit:** \`i >> 1\` is i without its last bit, so \`bits[i] = bits[i >> 1] + (i & 1)\`.
- **Drop the lowest set bit:** \`i & (i - 1)\` is i with one fewer 1, so \`bits[i] = bits[i & (i - 1)] + 1\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="bits of 13 equals bits of 6 plus the last bit 1: 1101 is 110 followed by 1, so 3 equals 2 plus 1">
  <defs>
    <marker id="b33q2-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="40" width="200" height="70" rx="10"/>
  <text class="d-text" x="140" y="70" text-anchor="middle">i = 13</text>
  <text class="d-sub" x="140" y="94" text-anchor="middle">1101</text>
  <path class="d-edge" d="M 242 75 L 314 75" marker-end="url(#b33q2-a2)"/>
  <text class="d-sub" x="278" y="60" text-anchor="middle">i &gt;&gt; 1</text>
  <rect class="d-box" x="320" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="400" y="70" text-anchor="middle">6</text>
  <text class="d-sub" x="400" y="94" text-anchor="middle">110, bits 2</text>
  <rect class="d-box" x="540" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="610" y="70" text-anchor="middle">i &amp; 1</text>
  <text class="d-sub" x="610" y="94" text-anchor="middle">last bit 1</text>
  <path class="d-edge" d="M 400 112 L 400 154" marker-end="url(#b33q2-a2)"/>
  <path class="d-edge" d="M 610 112 L 470 158" marker-end="url(#b33q2-a2)"/>
  <rect class="d-box-muted" x="260" y="160" width="280" height="44" rx="8"/>
  <text class="d-text" x="400" y="188" text-anchor="middle">bits[13] = 2 + 1 = 3</text>
</svg>

Because \`i >> 1 < i\`, the smaller answer is always ready when you need it, so one left-to-right pass fills the whole table in O(n). This is a tiny example of [dynamic programming](/interview-question/what-is-dynamic-programming). Example 2 builds the table for 0..100,000 both ways, checks it against the library popcount, and counts the work: 3,200,032 steps for the naive loop, 815,030 for Kernighan (one per set bit), and 100,000 for the DP.

In JavaScript:

~~~javascript
function countBitsDp(n) {
  // bits[i] = bits[i >> 1] + (i & 1): i without its last bit, plus that bit.
  const bits = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
  return bits;
}
~~~

## 9. Complexity

| Method | Time per number | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Check every bit | O(w), w = 32 or 64 | O(1) | one step per bit position |
| Kernighan | O(k), k = set bits | O(1) | one step per 1 bit |
| Byte lookup table | O(w / 8) | O(256) | 4 lookups for 32 bits |
| SWAR | O(log w) | O(1) | 5 operations for 32 bits, 6 for 64 |
| Built-in | O(1) in practice | O(1) | library code or a CPU instruction |
| All of 0..n by DP | O(n) total | O(n) | one addition per number |

Since w is fixed (32 or 64), every per-number method is technically O(1); the table above shows how the work scales with the word size and the number of 1 bits, which is what interviewers want to hear.

## Edge Cases

- **0:** popcount 0; Kernighan's loop does not run at all.
- **1 and powers of two:** popcount 1; Kernighan stops after one step, the naive loop still does 32.
- **The largest positive int (2147483647):** 31.
- **-1:** all ones, 32 in 32-bit arithmetic (64 in 64-bit). This is where languages differ; see section 5.
- **Other negatives:** -8 is 29 in 32 bits. Decide with the interviewer whether you want the 32-bit pattern or the magnitude.
- **64-bit values:** every mask in the SWAR method doubles in width and the final shift becomes 56.

## Common Pitfalls

- **Using \`>>\` in the naive loop.** For negative n it never reaches 0; use \`>>>\`.
- **Plain \`*\` for 32-bit multiplication.** A product of two large 32-bit values exceeds 2^53 and loses low bits; \`Math.imul\` gives the exact low 32 bits.
- **Values above 2^31.** Bitwise operators truncate them to 32 bits; use \`BigInt\` if the input can be that large.
- **\`toString(2)\` on a negative number.** It prints \`'-101'\`, counting the magnitude; convert with \`>>> 0\` first.
- **Using \`Array(256)\` for the table.** It starts as holes; \`new Uint8Array(256)\` starts at zeros.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define:</strong> <span style="color:#f0e2c8;">Popcount is the number of 1 bits; JavaScript bitwise operators see negatives as 32-bit two's complement.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Simple:</strong> <span style="color:#f0e2c8;">Check each of the 32 bits with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &amp; 1</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &gt;&gt;&gt;= 1</code> (unsigned shift, so negatives terminate).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Kernighan:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &amp;= n - 1</code> clears the lowest 1, so the loop runs once per set bit; -1 takes 32 steps.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Faster:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Uint8Array(256)</code> byte table (4 lookups) or SWAR with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;&gt;&gt;</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.imul</code> (5 operations).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JS built-ins:</strong> <span style="color:#f0e2c8;">No popcount. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(n &gt;&gt;&gt; 0).toString(2)</code> counting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'1'</code>s works but is slow; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.clz32</code> exists for leading zeros only.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&gt;&gt;&gt;</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&gt;&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;&gt;</code> copies the sign bit, so a negative value never becomes 0 and the loop hangs. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;&gt;&gt;</code> shifts in zeros.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Math.imul</code> in the SWAR step?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It multiplies as 32-bit integers and keeps the low 32 bits exactly, like C or Java. A normal <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code> produces a double; it is exact here because the product stays below 2^53, but not for general 32-bit products.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Count the bits of every number from 0 to n.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">DP: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bits[i] = bits[i &gt;&gt; 1] + (i &amp; 1)</code> in one pass, O(n). Example 2 verifies it for 0..100,000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you count bits of a 64-bit value?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code>: take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt.asUintN(64, n)</code> for negatives, then loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &amp;= n - 1n</code> until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0n</code>. Number bitwise operators cannot see past bit 31.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the Hamming distance between two integers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The popcount of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ b</code>, since XOR is 1 exactly where the bits differ.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Popcount / Hamming weight** | Number of 1 bits in a value |
| **Two's complement** | Signed integer encoding: -x is ~x + 1 |
| **Brian Kernighan's algorithm** | Repeat \`n &= n - 1\`; the iteration count is the popcount |
| **SWAR (SIMD within a register)** | Treat one word as several small fields and add them in parallel |

---
**Conclusion:** Counting set bits has a ladder of answers: check all 32 positions, then Kernighan's \`n &= n - 1\` at one step per 1 bit, then constant-time byte tables or SWAR, and for every number up to n a one-pass DP. In JavaScript the 32-bit rule of bitwise operators does most of the work for negatives; the details to get right are \`>>>\` instead of \`>>\`, \`Math.imul\` for the SWAR multiply, and \`BigInt\` for anything wider than 32 bits, since there is no built-in popcount.`,
        examples: [
          {
            label: `Naive vs Kernighan vs table vs SWAR vs string count`,
            code: `// Four ways to count the 1 bits of a 32-bit value, plus a built-in substitute.

function naive(n) {
  // Look at every one of the 32 bit positions. >>> keeps it unsigned.
  let count = 0;
  for (let i = 0; i < 32; i++) {
    count += n & 1;
    n >>>= 1;
  }
  return count;
}

function kernighan(n) {
  // n & (n - 1) clears the lowest 1 bit, so loop once per 1 bit.
  let count = 0, loops = 0;
  while (n !== 0) {
    n &= n - 1; // works on the int32 pattern, so negatives are fine
    count++;
    loops++;
  }
  return [count, loops];
}

const TABLE = new Uint8Array(256); // popcount of every byte
for (let i = 1; i < 256; i++) TABLE[i] = TABLE[i >> 1] + (i & 1);

function byTable(n) {
  return TABLE[n & 0xff] + TABLE[(n >>> 8) & 0xff] + TABLE[(n >>> 16) & 0xff] + TABLE[n >>> 24];
}

function swar(n) {
  // Add bits in parallel: pairs, then nibbles, then bytes.
  n = n - ((n >>> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
  n = (n + (n >>> 4)) & 0x0f0f0f0f;
  return Math.imul(n, 0x01010101) >>> 24; // Math.imul: 32-bit multiply, no float rounding
}

function builtin(n) {
  // JavaScript has no popcount; counting the 1s of the unsigned binary string is the usual one-liner.
  return (n >>> 0).toString(2).split('1').length - 1;
}

const pad = (v, w) => String(v).padStart(w);
for (const n of [0, 1, 7, 12, 255, 1024, 2147483647, -1, -8]) {
  const [k, loops] = kernighan(n);
  console.log(pad(n, 11) + ': naive ' + pad(naive(n), 2) + ', kernighan ' + pad(k, 2) +
    ' (' + pad(loops, 2) + ' loops), table ' + pad(byTable(n), 2) +
    ', swar ' + pad(swar(n), 2) + ', builtin ' + pad(builtin(n), 2));
}`,
          },
          {
            label: `Bits of every number 0..n with DP, and work counters`,
            code: `// Follow-up: popcount of every number 0..n. Reuse answers you already have.

function countBitsDp(n) {
  // bits[i] = bits[i >> 1] + (i & 1): i without its last bit, plus that bit.
  const bits = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
  return bits;
}

function countBitsLowbit(n) {
  // bits[i] = bits[i & (i - 1)] + 1: i without its lowest 1 bit, plus one.
  const bits = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) bits[i] = bits[i & (i - 1)] + 1;
  return bits;
}

console.log('0..16: [' + countBitsDp(16).join(', ') + ']');

const N = 100000;
const dp = countBitsDp(N);
const lowbit = countBitsLowbit(N);

const naiveSteps = 32 * (N + 1);
let kernSteps = 0;
for (let i = 0; i <= N; i++) {
  for (let v = i; v; v &= v - 1) kernSteps++;
}

let total = 0, same = true, matches = true, best = 0, bestAt = 0;
for (let i = 0; i <= N; i++) {
  total += dp[i];
  if (dp[i] !== lowbit[i]) same = false;
  if (dp[i] !== i.toString(2).split('1').length - 1) matches = false;
  if (dp[i] > best) { best = dp[i]; bestAt = i; }
}

console.log('N = ' + N);
console.log('total 1 bits (dp)         ' + total);
console.log('dp == lowbit version:     ' + same);
console.log('matches library count:    ' + matches);
console.log('naive steps   (32 per i)  ' + naiveSteps);
console.log('kernighan steps           ' + kernSteps);
console.log('dp steps      (1 per i)   ' + N);
console.log('max popcount in 0..N      ' + best + ' at ' + bestAt);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Write a Java method that returns the number of 1 bits in an \`int\`. Start simple, then make it faster, and tell me what it returns for a negative number."

**What a strong answer should cover:**
- The naive loop over 32 bit positions, then Brian Kernighan's \`n &= n - 1\`, which runs once per set bit.
- Constant-time options: a 256-entry byte table, or the parallel SWAR additions.
- Complexity: O(32) vs O(number of set bits) vs O(1), and the O(n) DP for every number 0..n.
- Java details: \`int\` is 32-bit two's complement, so negatives just work with Kernighan; the naive loop must use \`>>>\` (with \`>>\` it never ends for negatives); \`Integer.bitCount\` and \`Long.bitCount\` are the built-ins; \`int\` multiplication wraps, which the SWAR step relies on.

**Clarifying questions expected:**
- Should negative numbers count their 32-bit two's complement bits?
- \`int\` or \`long\`?

**Code / implementation expected:** Yes — Kernighan's loop in Java, then \`Integer.bitCount\`.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know loops and integers in Java; binary is explained as we go.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A night guard walks past an office tower and wants to know how many windows are lit. The slow way is to look at every single window, lit or dark, floor by floor. A sharper guard notices a pattern: if he could jump straight from one lit window to the next and skip the dark ones, the walk would take as many steps as there are lights, not as many as there are windows.

An integer is that tower: 32 (or 64) windows, each bit lit (1) or dark (0). "Count the set bits" means count the lit windows. The slow walk checks all 32 positions. The sharp guard's shortcut is one line of code, \`n & (n - 1)\`, which jumps straight past the lowest lit window. Faster still, you can count several windows at once with a lookup table, or count all of them in parallel with a few clever additions.

The question is a favourite because it has a ladder of answers (32 steps, then "one step per 1 bit", then constant time) and because it tests whether you know how your language stores negative numbers. It is also used everywhere in real code: Hamming distance, bitmask DP (how many items are in this set?), chess engines, and compression.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Signed or unsigned? What should a negative number return? | For -1, the 32-bit answer is 32 (all ones). Some languages need an explicit conversion to get that. |
| 32-bit or 64-bit? | The naive loop runs 32 or 64 times; masks in the parallel method change. |
| Is the function called once, or millions of times? | Many calls justify a lookup table or the built-in; one call does not. |
| Do you want the count for one number, or for every number from 0 to n? | The second is a different problem with an O(n) DP answer (section 8). |
| May I use the language's built-in? | Usually yes in practice; in an interview, show the manual method first, then name the built-in. |

## 3. What Exactly Are We Counting?

The **population count** (popcount) of a number is how many 1s appear in its binary form. 12 is \`1100\`, popcount 2. 255 is \`11111111\`, popcount 8. 2147483647, the largest 32-bit signed int, is 31 ones.

📌 **Interview term: Popcount / Hamming weight** — the number of 1 bits in an integer's binary representation. 'Count the set bits', 'number of 1 bits' and 'Hamming weight' all mean the same thing.

For negative numbers we count the bits of the **two's complement** pattern: -1 is 32 ones in a 32-bit int, so its popcount is 32; -8 is \`11111111111111111111111111111000\`, popcount 29.

📌 **Interview term: Two's complement** — the standard way signed integers are stored: -x is \`~x + 1\`, so -1 is all ones and the top bit is the sign bit.

## 4. Four Ways to Count, from Slowest to Fastest

### 4.1 Check every bit — O(w)

Look at the lowest bit with \`n & 1\`, add it to the count, shift \`n\` right by one, and repeat for all w bit positions (w = 32). Simple and always correct, but it does 32 steps even for the number 1.

### 4.2 Brian Kernighan's trick — O(number of set bits)

\`n & (n - 1)\` turns off the lowest set bit of n. Subtracting 1 flips the lowest 1 to 0 and turns every 0 below it into 1; AND-ing with the original then wipes all of those positions and leaves the higher bits alone. Repeat until n is 0 and count the steps: the loop runs once per set bit.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Kernighan steps on 44: 101100 becomes 101000, then 100000, then 000000; three steps means three set bits">
  <defs>
    <marker id="b33q2-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="250" height="50" rx="8"/>
  <text class="d-text" x="165" y="61" text-anchor="middle">n = 101100 (44)</text>
  <path class="d-edge" d="M 292 55 L 424 55" marker-end="url(#b33q2-a1)"/>
  <text class="d-sub" x="358" y="40" text-anchor="middle">n &amp; (n - 1)</text>
  <rect class="d-box" x="430" y="30" width="250" height="50" rx="8"/>
  <text class="d-text" x="555" y="61" text-anchor="middle">101000 (40), count 1</text>
  <path class="d-edge" d="M 555 82 L 555 124" marker-end="url(#b33q2-a1)"/>
  <rect class="d-box" x="430" y="130" width="250" height="50" rx="8"/>
  <text class="d-text" x="555" y="161" text-anchor="middle">100000 (32), count 2</text>
  <path class="d-edge" d="M 428 155 L 296 155" marker-end="url(#b33q2-a1)"/>
  <text class="d-sub" x="358" y="140" text-anchor="middle">n &amp; (n - 1)</text>
  <rect class="d-box-accent" x="40" y="130" width="250" height="50" rx="8"/>
  <text class="d-text" x="165" y="161" text-anchor="middle">000000, count 3</text>
  <text class="d-sub" x="165" y="215" text-anchor="middle">n is 0: stop</text>
</svg>

Each arrow removes exactly one 1 bit, so 44, which has three set bits, takes three steps instead of 32. For sparse numbers (few 1s) this is a big win; for -1 it is no better than the naive loop (32 steps).

📌 **Interview term: Brian Kernighan's algorithm** — count set bits by repeating \`n &= n - 1\` until n is 0; the number of iterations is the popcount.

### 4.3 Lookup table — O(w / 8)

Precompute the popcount of every byte value 0..255 once (256 small numbers), then split the integer into 4 bytes and add 4 table entries. The table itself is built with the same idea as the DP in section 8: \`table[i] = table[i >> 1] + (i & 1)\`. Trades 256 bytes of memory for a fixed 4 lookups.

### 4.4 Parallel (SWAR) counting — O(log w)

Instead of counting bits one by one, add them up in parallel inside the register. First every pair of bits is replaced by its own count (0, 1 or 2), then neighbouring pairs are added into 4-bit fields, then into bytes, and a final multiply adds the four bytes together. Five lines, no loop, no table:

| Step | Expression | 44 (8 bits shown) | Meaning |
| :--- | :--- | :--- | :--- |
| start | \`n\` | \`00 10 11 00\` | 4 pairs of bits |
| 2-bit counts | \`n - ((n >> 1) & 0x55555555)\` | \`00 01 10 00\` | pairs now hold 0, 1, 2, 0 |
| 4-bit counts | \`(n & 0x33333333) + ((n >> 2) & 0x33333333)\` | \`0001 0010\` | nibbles hold 1 and 2 |
| byte counts | \`(n + (n >> 4)) & 0x0F0F0F0F\` | \`00000011\` | the byte holds 3 |
| total | \`(n * 0x01010101) >> 24\` (32-bit) | 3 | sums all four bytes into the top byte |

📌 **Interview term: SWAR (SIMD within a register)** — treating one machine word as several small fields and operating on all of them at once with ordinary arithmetic and masks.

### 4.5 The built-in

Every language in this guide has a library way to do it (section 6). Use it in production code; library and compiler implementations can use dedicated CPU instructions where the hardware has them. In an interview, show Kernighan's method, mention the table and SWAR as faster constant-time options, and then name the built-in.

## 5. Negative Numbers in Java

Java's \`int\` is always 32-bit two's complement, so a negative \`int\` *is* its bit pattern: -1 is 32 ones, and Kernighan's loop on it runs 32 times and stops. Nothing to convert.

The one trap is the right shift. Java has two:

- \`>>\` (arithmetic) copies the sign bit in, so \`-1 >> 1\` is still -1 and a "shift until zero" loop never ends.
- \`>>>\` (logical) shifts in zeros, so after at most 32 shifts any \`int\` is 0.

The naive method must use \`>>>\`. \`Integer.bitCount(-1)\` is 32 and \`Integer.bitCount(-10)\` is 30, counting the two's complement pattern; for a \`long\`, \`Long.bitCount(-1L)\` is 64 (all three from our run).

## 6. The Code in Java

~~~java
static int[] kernighan(int n) {
    int count = 0, loops = 0;
    while (n != 0) {
        n &= n - 1; // clears the lowest 1 bit
        count++;
        loops++;
    }
    return new int[] {count, loops};
}
~~~

The example returns the number of loop iterations too, to show they equal the count. The SWAR version from section 4:

~~~java
static int swar(int n) {
    n = n - ((n >>> 1) & 0x55555555);
    n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
    n = (n + (n >>> 4)) & 0x0F0F0F0F;
    return (n * 0x01010101) >>> 24; // int multiply wraps mod 2^32, which is what we want
}
~~~

**What to point out in this code:**

- Kernighan needs no special handling for negatives: \`n != 0\` becomes true after exactly popcount steps.
- In \`swar\`, all shifts are \`>>>\`, and \`n * 0x01010101\` relies on \`int\` overflow wrapping modulo 2^32, which Java defines. The total lands in the top byte; \`>>> 24\` brings it down.
- The byte table is filled in a \`static\` initialiser with \`TABLE[i] = TABLE[i >> 1] + (i & 1)\`, the same recurrence as the 0..n follow-up.
- **The built-in:** \`Integer.bitCount(n)\` (and \`Long.bitCount\`), which counts the two's complement pattern. How the JVM compiles it depends on the JVM and the CPU (we did not inspect that here); in an interview, write Kernighan first, then mention it.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — naive, Kernighan, byte table, SWAR and Integer.bitCount on nine values** prints:

~~~text
          0: naive  0, kernighan  0 ( 0 loops), table  0, swar  0, builtin  0
          1: naive  1, kernighan  1 ( 1 loops), table  1, swar  1, builtin  1
          7: naive  3, kernighan  3 ( 3 loops), table  3, swar  3, builtin  3
         12: naive  2, kernighan  2 ( 2 loops), table  2, swar  2, builtin  2
        255: naive  8, kernighan  8 ( 8 loops), table  8, swar  8, builtin  8
       1024: naive  1, kernighan  1 ( 1 loops), table  1, swar  1, builtin  1
 2147483647: naive 31, kernighan 31 (31 loops), table 31, swar 31, builtin 31
         -1: naive 32, kernighan 32 (32 loops), table 32, swar 32, builtin 32
         -8: naive 29, kernighan 29 (29 loops), table 29, swar 29, builtin 29
~~~

All five agree on every value, and Kernighan's loop count equals the popcount. Negative values need no conversion in Java.

**Example 2 — the 0..n DP, checked against Integer.bitCount and with work counters** prints:

~~~text
0..16: [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4, 1]
N = 100000
total 1 bits (dp)         815030
dp == lowbit version:     true
matches library count:    true
naive steps   (32 per i)  3200032
kernighan steps           815030
dp steps      (1 per i)   100000
max popcount in 0..N      16 at 65535
~~~

The two DP formulas agree everywhere (\`Arrays.equals\`), and the largest popcount below 100,000 is 16, at 65535 = 2^16 - 1.

## 8. Follow-Up: Count the Bits of Every Number from 0 to n

Calling popcount on each number separately costs O(n · w), or O(total set bits) with Kernighan. But each answer can be built from a smaller one you already have:

- **Drop the last bit:** \`i >> 1\` is i without its last bit, so \`bits[i] = bits[i >> 1] + (i & 1)\`.
- **Drop the lowest set bit:** \`i & (i - 1)\` is i with one fewer 1, so \`bits[i] = bits[i & (i - 1)] + 1\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="bits of 13 equals bits of 6 plus the last bit 1: 1101 is 110 followed by 1, so 3 equals 2 plus 1">
  <defs>
    <marker id="b33q2-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="40" width="200" height="70" rx="10"/>
  <text class="d-text" x="140" y="70" text-anchor="middle">i = 13</text>
  <text class="d-sub" x="140" y="94" text-anchor="middle">1101</text>
  <path class="d-edge" d="M 242 75 L 314 75" marker-end="url(#b33q2-a2)"/>
  <text class="d-sub" x="278" y="60" text-anchor="middle">i &gt;&gt; 1</text>
  <rect class="d-box" x="320" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="400" y="70" text-anchor="middle">6</text>
  <text class="d-sub" x="400" y="94" text-anchor="middle">110, bits 2</text>
  <rect class="d-box" x="540" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="610" y="70" text-anchor="middle">i &amp; 1</text>
  <text class="d-sub" x="610" y="94" text-anchor="middle">last bit 1</text>
  <path class="d-edge" d="M 400 112 L 400 154" marker-end="url(#b33q2-a2)"/>
  <path class="d-edge" d="M 610 112 L 470 158" marker-end="url(#b33q2-a2)"/>
  <rect class="d-box-muted" x="260" y="160" width="280" height="44" rx="8"/>
  <text class="d-text" x="400" y="188" text-anchor="middle">bits[13] = 2 + 1 = 3</text>
</svg>

Because \`i >> 1 < i\`, the smaller answer is always ready when you need it, so one left-to-right pass fills the whole table in O(n). This is a tiny example of [dynamic programming](/interview-question/what-is-dynamic-programming). Example 2 builds the table for 0..100,000 both ways, checks it against the library popcount, and counts the work: 3,200,032 steps for the naive loop, 815,030 for Kernighan (one per set bit), and 100,000 for the DP.

In Java:

~~~java
static int[] countBitsDp(int n) {
    int[] bits = new int[n + 1];
    for (int i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
    return bits;
}
~~~

## 9. Complexity

| Method | Time per number | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Check every bit | O(w), w = 32 or 64 | O(1) | one step per bit position |
| Kernighan | O(k), k = set bits | O(1) | one step per 1 bit |
| Byte lookup table | O(w / 8) | O(256) | 4 lookups for 32 bits |
| SWAR | O(log w) | O(1) | 5 operations for 32 bits, 6 for 64 |
| Built-in | O(1) in practice | O(1) | library code or a CPU instruction |
| All of 0..n by DP | O(n) total | O(n) | one addition per number |

Since w is fixed (32 or 64), every per-number method is technically O(1); the table above shows how the work scales with the word size and the number of 1 bits, which is what interviewers want to hear.

## Edge Cases

- **0:** popcount 0; Kernighan's loop does not run at all.
- **1 and powers of two:** popcount 1; Kernighan stops after one step, the naive loop still does 32.
- **The largest positive int (2147483647):** 31.
- **-1:** all ones, 32 in 32-bit arithmetic (64 in 64-bit). This is where languages differ; see section 5.
- **Other negatives:** -8 is 29 in 32 bits. Decide with the interviewer whether you want the 32-bit pattern or the magnitude.
- **64-bit values:** every mask in the SWAR method doubles in width and the final shift becomes 56.

## Common Pitfalls

- **\`>>\` in the naive loop.** It never terminates for negative input; use \`>>>\`.
- **\`Integer.bitCount\` on a \`long\`.** The \`long\` does not narrow implicitly, so it will not compile; and an explicit \`(int)\` cast silently drops the high 32 bits. Use \`Long.bitCount\`.
- **Using \`byte\` values without \`& 0xFF\`.** \`Integer.bitCount((byte) -1)\` is 32, not 8, because the byte is sign-extended to an \`int\`.
- **Building the table inside the method.** It belongs in a \`static final\` field, built once.
- **Comparing \`Integer\` counts from a collection with \`==\`.** Above 127 that compares object identity; unbox first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define:</strong> <span style="color:#f0e2c8;">Popcount is the number of 1 bits; a Java <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> is 32-bit two's complement, so -1 has 32.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Simple:</strong> <span style="color:#f0e2c8;">Check each of the 32 bits with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &amp; 1</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &gt;&gt;&gt;= 1</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;&gt;</code> would hang on negatives.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Kernighan:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &amp;= n - 1</code> clears the lowest 1, so the loop runs once per set bit.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Faster:</strong> <span style="color:#f0e2c8;">A static 256-entry byte table (4 lookups) or SWAR (5 operations, relying on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> wrap-around).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java built-in:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.bitCount</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Long.bitCount</code>; mention them after writing Kernighan.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&gt;&gt;&gt;</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&gt;&gt;</code> in the simple loop?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;&gt;</code> copies the sign bit, so a negative number never becomes 0. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&gt;&gt;&gt;</code> shifts in zeros, and 32 shifts always reach 0.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Count the bits of every number from 0 to n.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">DP: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bits[i] = bits[i &gt;&gt; 1] + (i &amp; 1)</code> in one pass, O(n). Example 2 checks it against <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.bitCount</code> for 0..100,000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the SWAR multiply safe in Java?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> multiplication is defined to wrap modulo 2^32, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n * 0x01010101</code> keeps exactly the low 32 bits and the sum lands in the top byte.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Integer.bitCount(-10)</code> return?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">30: it counts the two's complement pattern, and -10 has 30 one bits.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the Hamming distance between two ints?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.bitCount(a ^ b)</code>, because XOR is 1 exactly where the bits differ.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Popcount / Hamming weight** | Number of 1 bits in a value |
| **Two's complement** | Signed integer encoding: -x is ~x + 1 |
| **Brian Kernighan's algorithm** | Repeat \`n &= n - 1\`; the iteration count is the popcount |
| **SWAR (SIMD within a register)** | Treat one word as several small fields and add them in parallel |

---
**Conclusion:** Counting set bits has a ladder of answers: check all 32 positions, then Kernighan's \`n &= n - 1\` at one step per 1 bit, then constant-time byte tables or SWAR, and for every number up to n a one-pass DP. Java makes negatives easy because \`int\` is a fixed 32-bit two's complement value; the details are \`>>>\` rather than \`>>\` in shifting loops, \`Long.bitCount\` for \`long\`, and knowing that \`Integer.bitCount\` is the production answer.`,
        examples: [
          {
            label: `Naive vs Kernighan vs table vs SWAR vs Integer.bitCount`,
            code: `// Four ways to count the 1 bits of a 32-bit int, plus Integer.bitCount.
public class Main {
    static int naive(int n) {
        int count = 0;
        for (int i = 0; i < 32; i++) {
            count += n & 1;
            n >>>= 1; // logical shift: >> would drag the sign bit in forever
        }
        return count;
    }

    static int[] kernighan(int n) {
        int count = 0, loops = 0;
        while (n != 0) {
            n &= n - 1; // clears the lowest 1 bit
            count++;
            loops++;
        }
        return new int[] {count, loops};
    }

    static final int[] TABLE = new int[256];
    static {
        for (int i = 1; i < 256; i++) TABLE[i] = TABLE[i >> 1] + (i & 1);
    }

    static int byTable(int n) {
        return TABLE[n & 0xFF] + TABLE[(n >>> 8) & 0xFF] + TABLE[(n >>> 16) & 0xFF] + TABLE[n >>> 24];
    }

    static int swar(int n) {
        n = n - ((n >>> 1) & 0x55555555);
        n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
        n = (n + (n >>> 4)) & 0x0F0F0F0F;
        return (n * 0x01010101) >>> 24; // int multiply wraps mod 2^32, which is what we want
    }

    public static void main(String[] args) {
        int[] tests = {0, 1, 7, 12, 255, 1024, 2147483647, -1, -8};
        for (int n : tests) {
            int[] k = kernighan(n);
            System.out.println(String.format("%11d: naive %2d, kernighan %2d (%2d loops), table %2d, swar %2d, builtin %2d",
                    n, naive(n), k[0], k[1], byTable(n), swar(n), Integer.bitCount(n)));
        }
    }
}`,
          },
          {
            label: `Bits of every number 0..n with DP, and work counters`,
            code: `import java.util.Arrays;
import java.util.StringJoiner;

// Follow-up: popcount of every number 0..n. Reuse answers you already have.
public class Main {
    static int[] countBitsDp(int n) {
        int[] bits = new int[n + 1];
        for (int i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
        return bits;
    }

    static int[] countBitsLowbit(int n) {
        int[] bits = new int[n + 1];
        for (int i = 1; i <= n; i++) bits[i] = bits[i & (i - 1)] + 1;
        return bits;
    }

    public static void main(String[] args) {
        StringJoiner sj = new StringJoiner(", ", "[", "]");
        for (int b : countBitsDp(16)) sj.add(String.valueOf(b));
        System.out.println("0..16: " + sj);

        int N = 100000;
        int[] dp = countBitsDp(N);
        int[] lowbit = countBitsLowbit(N);

        long naiveSteps = 32L * (N + 1);
        long kernSteps = 0;
        for (int i = 0; i <= N; i++)
            for (int v = i; v != 0; v &= v - 1) kernSteps++;

        long total = 0;
        boolean matches = true;
        int best = 0, bestAt = 0;
        for (int i = 0; i <= N; i++) {
            total += dp[i];
            if (dp[i] != Integer.bitCount(i)) matches = false;
            if (dp[i] > best) { best = dp[i]; bestAt = i; }
        }
        System.out.println("N = " + N);
        System.out.println("total 1 bits (dp)         " + total);
        System.out.println("dp == lowbit version:     " + Arrays.equals(dp, lowbit));
        System.out.println("matches library count:    " + matches);
        System.out.println("naive steps   (32 per i)  " + naiveSteps);
        System.out.println("kernighan steps           " + kernSteps);
        System.out.println("dp steps      (1 per i)   " + N);
        System.out.println("max popcount in 0..N      " + best + " at " + bestAt);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Write a C++ function that returns the number of 1 bits in a 32-bit integer. Start simple, then make it faster, and tell me what happens with negative numbers."

**What a strong answer should cover:**
- The naive loop over 32 bit positions, then Brian Kernighan's \`n &= n - 1\`, which runs once per set bit.
- Constant-time options: a 256-entry byte table, or the parallel SWAR additions.
- Complexity: O(32) vs O(number of set bits) vs O(1), and the O(n) DP for every number 0..n.
- C++ details: convert to \`uint32_t\` first (logical shifts, wrap-around multiply, no undefined behaviour); \`std::bitset<32>(x).count()\` is the portable C++17 built-in, \`__builtin_popcount\` the GCC/Clang one, \`std::popcount\` the C++20 one; \`__builtin_popcount\` takes \`unsigned int\`, so 64-bit values need \`__builtin_popcountll\`.

**Clarifying questions expected:**
- Should negative numbers count their 32-bit two's complement bits?
- 32-bit or 64-bit input?

**Code / implementation expected:** Yes — Kernighan's loop on \`uint32_t\` in C++17, then \`std::bitset\` or the compiler built-in.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know loops and integers in C++; binary is explained as we go.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A night guard walks past an office tower and wants to know how many windows are lit. The slow way is to look at every single window, lit or dark, floor by floor. A sharper guard notices a pattern: if he could jump straight from one lit window to the next and skip the dark ones, the walk would take as many steps as there are lights, not as many as there are windows.

An integer is that tower: 32 (or 64) windows, each bit lit (1) or dark (0). "Count the set bits" means count the lit windows. The slow walk checks all 32 positions. The sharp guard's shortcut is one line of code, \`n & (n - 1)\`, which jumps straight past the lowest lit window. Faster still, you can count several windows at once with a lookup table, or count all of them in parallel with a few clever additions.

The question is a favourite because it has a ladder of answers (32 steps, then "one step per 1 bit", then constant time) and because it tests whether you know how your language stores negative numbers. It is also used everywhere in real code: Hamming distance, bitmask DP (how many items are in this set?), chess engines, and compression.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Signed or unsigned? What should a negative number return? | For -1, the 32-bit answer is 32 (all ones). Some languages need an explicit conversion to get that. |
| 32-bit or 64-bit? | The naive loop runs 32 or 64 times; masks in the parallel method change. |
| Is the function called once, or millions of times? | Many calls justify a lookup table or the built-in; one call does not. |
| Do you want the count for one number, or for every number from 0 to n? | The second is a different problem with an O(n) DP answer (section 8). |
| May I use the language's built-in? | Usually yes in practice; in an interview, show the manual method first, then name the built-in. |

## 3. What Exactly Are We Counting?

The **population count** (popcount) of a number is how many 1s appear in its binary form. 12 is \`1100\`, popcount 2. 255 is \`11111111\`, popcount 8. 2147483647, the largest 32-bit signed int, is 31 ones.

📌 **Interview term: Popcount / Hamming weight** — the number of 1 bits in an integer's binary representation. 'Count the set bits', 'number of 1 bits' and 'Hamming weight' all mean the same thing.

For negative numbers we count the bits of the **two's complement** pattern: -1 is 32 ones in a 32-bit int, so its popcount is 32; -8 is \`11111111111111111111111111111000\`, popcount 29.

📌 **Interview term: Two's complement** — the standard way signed integers are stored: -x is \`~x + 1\`, so -1 is all ones and the top bit is the sign bit.

## 4. Four Ways to Count, from Slowest to Fastest

### 4.1 Check every bit — O(w)

Look at the lowest bit with \`n & 1\`, add it to the count, shift \`n\` right by one, and repeat for all w bit positions (w = 32). Simple and always correct, but it does 32 steps even for the number 1.

### 4.2 Brian Kernighan's trick — O(number of set bits)

\`n & (n - 1)\` turns off the lowest set bit of n. Subtracting 1 flips the lowest 1 to 0 and turns every 0 below it into 1; AND-ing with the original then wipes all of those positions and leaves the higher bits alone. Repeat until n is 0 and count the steps: the loop runs once per set bit.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Kernighan steps on 44: 101100 becomes 101000, then 100000, then 000000; three steps means three set bits">
  <defs>
    <marker id="b33q2-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="250" height="50" rx="8"/>
  <text class="d-text" x="165" y="61" text-anchor="middle">n = 101100 (44)</text>
  <path class="d-edge" d="M 292 55 L 424 55" marker-end="url(#b33q2-a1)"/>
  <text class="d-sub" x="358" y="40" text-anchor="middle">n &amp; (n - 1)</text>
  <rect class="d-box" x="430" y="30" width="250" height="50" rx="8"/>
  <text class="d-text" x="555" y="61" text-anchor="middle">101000 (40), count 1</text>
  <path class="d-edge" d="M 555 82 L 555 124" marker-end="url(#b33q2-a1)"/>
  <rect class="d-box" x="430" y="130" width="250" height="50" rx="8"/>
  <text class="d-text" x="555" y="161" text-anchor="middle">100000 (32), count 2</text>
  <path class="d-edge" d="M 428 155 L 296 155" marker-end="url(#b33q2-a1)"/>
  <text class="d-sub" x="358" y="140" text-anchor="middle">n &amp; (n - 1)</text>
  <rect class="d-box-accent" x="40" y="130" width="250" height="50" rx="8"/>
  <text class="d-text" x="165" y="161" text-anchor="middle">000000, count 3</text>
  <text class="d-sub" x="165" y="215" text-anchor="middle">n is 0: stop</text>
</svg>

Each arrow removes exactly one 1 bit, so 44, which has three set bits, takes three steps instead of 32. For sparse numbers (few 1s) this is a big win; for -1 it is no better than the naive loop (32 steps).

📌 **Interview term: Brian Kernighan's algorithm** — count set bits by repeating \`n &= n - 1\` until n is 0; the number of iterations is the popcount.

### 4.3 Lookup table — O(w / 8)

Precompute the popcount of every byte value 0..255 once (256 small numbers), then split the integer into 4 bytes and add 4 table entries. The table itself is built with the same idea as the DP in section 8: \`table[i] = table[i >> 1] + (i & 1)\`. Trades 256 bytes of memory for a fixed 4 lookups.

### 4.4 Parallel (SWAR) counting — O(log w)

Instead of counting bits one by one, add them up in parallel inside the register. First every pair of bits is replaced by its own count (0, 1 or 2), then neighbouring pairs are added into 4-bit fields, then into bytes, and a final multiply adds the four bytes together. Five lines, no loop, no table:

| Step | Expression | 44 (8 bits shown) | Meaning |
| :--- | :--- | :--- | :--- |
| start | \`n\` | \`00 10 11 00\` | 4 pairs of bits |
| 2-bit counts | \`n - ((n >> 1) & 0x55555555)\` | \`00 01 10 00\` | pairs now hold 0, 1, 2, 0 |
| 4-bit counts | \`(n & 0x33333333) + ((n >> 2) & 0x33333333)\` | \`0001 0010\` | nibbles hold 1 and 2 |
| byte counts | \`(n + (n >> 4)) & 0x0F0F0F0F\` | \`00000011\` | the byte holds 3 |
| total | \`(n * 0x01010101) >> 24\` (32-bit) | 3 | sums all four bytes into the top byte |

📌 **Interview term: SWAR (SIMD within a register)** — treating one machine word as several small fields and operating on all of them at once with ordinary arithmetic and masks.

### 4.5 The built-in

Every language in this guide has a library way to do it (section 6). Use it in production code; library and compiler implementations can use dedicated CPU instructions where the hardware has them. In an interview, show Kernighan's method, mention the table and SWAR as faster constant-time options, and then name the built-in.

## 5. Negative Numbers in C++

The safe move in C++ is to convert to an unsigned type before doing anything: \`uint32_t u = static_cast<uint32_t>(n);\`. Converting a negative \`int\` to \`uint32_t\` is defined to wrap modulo 2^32, so -1 becomes 4294967295, 32 ones, and every method below sees the two's complement pattern.

Why not stay signed?

- **Right shift.** Right-shifting a negative signed value was implementation-defined before C++20 (GCC copies the sign bit), so a "shift until zero" loop on -1 never ends. On \`uint32_t\`, \`>>\` always shifts in zeros.
- **Multiply.** The SWAR method multiplies by \`0x01010101\` and needs the product to wrap; signed overflow is undefined behaviour, unsigned overflow wraps by definition.

Kernighan's \`n & (n - 1)\` on a signed \`int\` happens to work on GCC, but \`INT_MIN - 1\` is signed overflow, so the unsigned version is the one to write.

## 6. The Code in C++

~~~cpp
int kernighan(uint32_t n, int& loops) {
    int count = 0;
    loops = 0;
    while (n) {
        n &= n - 1;  // clears the lowest 1 bit
        count++;
        loops++;
    }
    return count;
}
~~~

The example also reports the number of loop iterations, to show they equal the count. The SWAR version from section 4:

~~~cpp
int swar(uint32_t n) {
    n = n - ((n >> 1) & 0x55555555u);
    n = (n & 0x33333333u) + ((n >> 2) & 0x33333333u);
    n = (n + (n >> 4)) & 0x0F0F0F0Fu;
    return (n * 0x01010101u) >> 24;  // unsigned multiply wraps mod 2^32 (well defined)
}
~~~

**What to point out in this code:**

- The parameter is \`uint32_t\`; the caller converts once with \`static_cast<uint32_t>(n)\`, so negatives are defined and terminate.
- In \`swar\`, all constants carry the \`u\` suffix and the multiply wraps modulo 2^32 by definition; the total lands in the top byte.
- **Built-ins:** \`std::bitset<32>(u).count()\` is standard C++ and portable. \`__builtin_popcount(u)\` is a GCC/Clang extension that takes \`unsigned int\` (\`__builtin_popcountll\` for 64-bit); in our check, GCC 13 at \`-O2\` compiled it to a call to the library routine \`__popcountdi2\`, and with \`-mpopcnt\` to a single \`popcnt\` instruction. C++20 adds \`std::popcount\` in \`<bit>\`, for unsigned types only ([cppreference](https://en.cppreference.com/w/cpp/numeric/popcount)). Example 1 checks that \`__builtin_popcount\` and \`std::bitset\` agree.
- The byte table is a plain \`unsigned char[256]\`, filled once with \`TABLE[i] = TABLE[i >> 1] + (i & 1)\`.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — naive, Kernighan, byte table, SWAR and __builtin_popcount on nine values** prints:

~~~text
          0: naive  0, kernighan  0 ( 0 loops), table  0, swar  0, builtin  0
          1: naive  1, kernighan  1 ( 1 loops), table  1, swar  1, builtin  1
          7: naive  3, kernighan  3 ( 3 loops), table  3, swar  3, builtin  3
         12: naive  2, kernighan  2 ( 2 loops), table  2, swar  2, builtin  2
        255: naive  8, kernighan  8 ( 8 loops), table  8, swar  8, builtin  8
       1024: naive  1, kernighan  1 ( 1 loops), table  1, swar  1, builtin  1
 2147483647: naive 31, kernighan 31 (31 loops), table 31, swar 31, builtin 31
         -1: naive 32, kernighan 32 (32 loops), table 32, swar 32, builtin 32
         -8: naive 29, kernighan 29 (29 loops), table 29, swar 29, builtin 29
~~~

All five agree on every value (and \`std::bitset::count\` agreed too; the program would have printed \`bitset disagrees\` otherwise). The -1 and -8 rows work because each value is converted to \`uint32_t\` first.

**Example 2 — the 0..n DP, checked against std::bitset and with work counters** prints:

~~~text
0..16: [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4, 1]
N = 100000
total 1 bits (dp)         815030
dp == lowbit version:     true
matches library count:    true
naive steps   (32 per i)  3200032
kernighan steps           815030
dp steps      (1 per i)   100000
max popcount in 0..N      16 at 65535
~~~

The two DP vectors compare equal with \`==\`, and the largest popcount below 100,000 is 16, at 65535 = 2^16 - 1.

## 8. Follow-Up: Count the Bits of Every Number from 0 to n

Calling popcount on each number separately costs O(n · w), or O(total set bits) with Kernighan. But each answer can be built from a smaller one you already have:

- **Drop the last bit:** \`i >> 1\` is i without its last bit, so \`bits[i] = bits[i >> 1] + (i & 1)\`.
- **Drop the lowest set bit:** \`i & (i - 1)\` is i with one fewer 1, so \`bits[i] = bits[i & (i - 1)] + 1\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="bits of 13 equals bits of 6 plus the last bit 1: 1101 is 110 followed by 1, so 3 equals 2 plus 1">
  <defs>
    <marker id="b33q2-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="40" width="200" height="70" rx="10"/>
  <text class="d-text" x="140" y="70" text-anchor="middle">i = 13</text>
  <text class="d-sub" x="140" y="94" text-anchor="middle">1101</text>
  <path class="d-edge" d="M 242 75 L 314 75" marker-end="url(#b33q2-a2)"/>
  <text class="d-sub" x="278" y="60" text-anchor="middle">i &gt;&gt; 1</text>
  <rect class="d-box" x="320" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="400" y="70" text-anchor="middle">6</text>
  <text class="d-sub" x="400" y="94" text-anchor="middle">110, bits 2</text>
  <rect class="d-box" x="540" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="610" y="70" text-anchor="middle">i &amp; 1</text>
  <text class="d-sub" x="610" y="94" text-anchor="middle">last bit 1</text>
  <path class="d-edge" d="M 400 112 L 400 154" marker-end="url(#b33q2-a2)"/>
  <path class="d-edge" d="M 610 112 L 470 158" marker-end="url(#b33q2-a2)"/>
  <rect class="d-box-muted" x="260" y="160" width="280" height="44" rx="8"/>
  <text class="d-text" x="400" y="188" text-anchor="middle">bits[13] = 2 + 1 = 3</text>
</svg>

Because \`i >> 1 < i\`, the smaller answer is always ready when you need it, so one left-to-right pass fills the whole table in O(n). This is a tiny example of [dynamic programming](/interview-question/what-is-dynamic-programming). Example 2 builds the table for 0..100,000 both ways, checks it against the library popcount, and counts the work: 3,200,032 steps for the naive loop, 815,030 for Kernighan (one per set bit), and 100,000 for the DP.

In C++:

~~~cpp
std::vector<int> countBitsDp(int n) {
    std::vector<int> bits(n + 1, 0);
    for (int i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
    return bits;
}
~~~

## 9. Complexity

| Method | Time per number | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Check every bit | O(w), w = 32 or 64 | O(1) | one step per bit position |
| Kernighan | O(k), k = set bits | O(1) | one step per 1 bit |
| Byte lookup table | O(w / 8) | O(256) | 4 lookups for 32 bits |
| SWAR | O(log w) | O(1) | 5 operations for 32 bits, 6 for 64 |
| Built-in | O(1) in practice | O(1) | library code or a CPU instruction |
| All of 0..n by DP | O(n) total | O(n) | one addition per number |

Since w is fixed (32 or 64), every per-number method is technically O(1); the table above shows how the work scales with the word size and the number of 1 bits, which is what interviewers want to hear.

## Edge Cases

- **0:** popcount 0; Kernighan's loop does not run at all.
- **1 and powers of two:** popcount 1; Kernighan stops after one step, the naive loop still does 32.
- **The largest positive int (2147483647):** 31.
- **-1:** all ones, 32 in 32-bit arithmetic (64 in 64-bit). This is where languages differ; see section 5.
- **Other negatives:** -8 is 29 in 32 bits. Decide with the interviewer whether you want the 32-bit pattern or the magnitude.
- **64-bit values:** every mask in the SWAR method doubles in width and the final shift becomes 56.

## Common Pitfalls

- **Shifting a negative \`int\` until it is zero.** Before C++20 the shift is implementation-defined and on GCC it never reaches 0; use \`uint32_t\`.
- **\`__builtin_popcount\` on 64-bit values.** It takes \`unsigned int\` and truncates; use \`__builtin_popcountll\` or \`std::bitset<64>\`.
- **Assuming \`__builtin_popcount\` is portable.** It is a GCC/Clang extension; MSVC has different intrinsics. \`std::bitset\` works everywhere.
- **Signed SWAR.** The multiply overflows; signed overflow is undefined behaviour. Keep every value unsigned.
- **\`std::popcount\` in C++17 code.** It is C++20 (\`<bit>\`), and only accepts unsigned types.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define:</strong> <span style="color:#f0e2c8;">Popcount is the number of 1 bits; convert to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uint32_t</code> so negatives use their two's complement pattern.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Simple:</strong> <span style="color:#f0e2c8;">Check each of the 32 bits with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &amp; 1u</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &gt;&gt;= 1</code> on unsigned: always 32 steps.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Kernighan:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n &amp;= n - 1</code> clears the lowest 1, so the loop runs once per set bit.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Faster:</strong> <span style="color:#f0e2c8;">A 256-entry byte table (4 lookups) or SWAR (5 unsigned operations).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ built-ins:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::bitset&lt;32&gt;(u).count()</code> (portable), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__builtin_popcount</code> (GCC/Clang, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ll</code> for 64-bit), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::popcount</code> (C++20).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why convert to unsigned first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unsigned right shifts always fill with zeros and unsigned arithmetic wraps by definition, while signed overflow is undefined and signed right shifts of negatives were implementation-defined before C++20.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Count the bits of every number from 0 to n.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">DP: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bits[i] = bits[i &gt;&gt; 1] + (i &amp; 1)</code> in one pass, O(n). Example 2 checks it against <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::bitset</code> for 0..100,000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__builtin_popcount</code> really one instruction?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only when the compiler may assume the CPU has one: GCC 13 at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-O2</code> emitted a call to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__popcountdi2</code>, and with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-mpopcnt</code> a single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">popcnt</code> instruction.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you count bits of a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">uint64_t</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__builtin_popcountll(x)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::bitset&lt;64&gt;(x).count()</code>; SWAR with 64-bit masks, multiply by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0x0101010101010101</code> and shift by 56.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the Hamming distance between two integers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The popcount of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ b</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::bitset&lt;32&gt;(a ^ b).count()</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Popcount / Hamming weight** | Number of 1 bits in a value |
| **Two's complement** | Signed integer encoding: -x is ~x + 1 |
| **Brian Kernighan's algorithm** | Repeat \`n &= n - 1\`; the iteration count is the popcount |
| **SWAR (SIMD within a register)** | Treat one word as several small fields and add them in parallel |

---
**Conclusion:** Counting set bits has a ladder of answers: check all 32 positions, then Kernighan's \`n &= n - 1\` at one step per 1 bit, then constant-time byte tables or SWAR, and for every number up to n a one-pass DP. In C++ the rule that keeps all of them correct is to work on \`uint32_t\` (or \`uint64_t\`): shifts become logical and the SWAR multiply wraps by definition. For production, \`std::bitset::count\` is portable, \`__builtin_popcount\` is the GCC/Clang shortcut, and C++20 adds \`std::popcount\`.`,
        examples: [
          {
            label: `Naive vs Kernighan vs table vs SWAR vs __builtin_popcount`,
            code: `// Four ways to count the 1 bits of a 32-bit value, plus the built-ins.
#include <bitset>
#include <cstdint>
#include <cstdio>

int naive(uint32_t n) {
    int count = 0;
    for (int i = 0; i < 32; i++) {
        count += n & 1u;
        n >>= 1;  // unsigned, so this is a logical shift
    }
    return count;
}

int kernighan(uint32_t n, int& loops) {
    int count = 0;
    loops = 0;
    while (n) {
        n &= n - 1;  // clears the lowest 1 bit
        count++;
        loops++;
    }
    return count;
}

unsigned char TABLE[256];

int byTable(uint32_t n) {
    return TABLE[n & 0xFF] + TABLE[(n >> 8) & 0xFF] + TABLE[(n >> 16) & 0xFF] + TABLE[n >> 24];
}

int swar(uint32_t n) {
    n = n - ((n >> 1) & 0x55555555u);
    n = (n & 0x33333333u) + ((n >> 2) & 0x33333333u);
    n = (n + (n >> 4)) & 0x0F0F0F0Fu;
    return (n * 0x01010101u) >> 24;  // unsigned multiply wraps mod 2^32 (well defined)
}

int main() {
    for (int i = 1; i < 256; i++) TABLE[i] = TABLE[i >> 1] + (i & 1);
    int tests[] = {0, 1, 7, 12, 255, 1024, 2147483647, -1, -8};
    for (int n : tests) {
        uint32_t u = static_cast<uint32_t>(n);  // the 32-bit pattern, defined for negatives too
        int loops;
        int k = kernighan(u, loops);
        int builtin = __builtin_popcount(u);  // GCC/Clang; std::bitset<32>(u).count() is portable
        std::printf("%11d: naive %2d, kernighan %2d (%2d loops), table %2d, swar %2d, builtin %2d\\n",
                    n, naive(u), k, loops, byTable(u), swar(u), builtin);
        if (builtin != static_cast<int>(std::bitset<32>(u).count())) std::printf("bitset disagrees\\n");
    }
}`,
          },
          {
            label: `Bits of every number 0..n with DP, and work counters`,
            code: `// Follow-up: popcount of every number 0..n. Reuse answers you already have.
#include <bitset>
#include <iostream>
#include <vector>

std::vector<int> countBitsDp(int n) {
    std::vector<int> bits(n + 1, 0);
    for (int i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
    return bits;
}

std::vector<int> countBitsLowbit(int n) {
    std::vector<int> bits(n + 1, 0);
    for (int i = 1; i <= n; i++) bits[i] = bits[i & (i - 1)] + 1;
    return bits;
}

int main() {
    std::cout << std::boolalpha;
    std::vector<int> small = countBitsDp(16);
    std::cout << "0..16: [";
    for (size_t i = 0; i < small.size(); i++) std::cout << (i ? ", " : "") << small[i];
    std::cout << "]\\n";

    const int N = 100000;
    std::vector<int> dp = countBitsDp(N), lowbit = countBitsLowbit(N);

    long long naiveSteps = 32LL * (N + 1), kernSteps = 0;
    for (int i = 0; i <= N; i++)
        for (unsigned v = i; v; v &= v - 1) kernSteps++;

    long long total = 0;
    bool matches = true;
    int best = 0, bestAt = 0;
    for (int i = 0; i <= N; i++) {
        total += dp[i];
        if (dp[i] != static_cast<int>(std::bitset<32>(i).count())) matches = false;
        if (dp[i] > best) { best = dp[i]; bestAt = i; }
    }
    std::cout << "N = " << N << "\\n";
    std::cout << "total 1 bits (dp)         " << total << "\\n";
    std::cout << "dp == lowbit version:     " << (dp == lowbit) << "\\n";
    std::cout << "matches library count:    " << matches << "\\n";
    std::cout << "naive steps   (32 per i)  " << naiveSteps << "\\n";
    std::cout << "kernighan steps           " << kernSteps << "\\n";
    std::cout << "dp steps      (1 per i)   " << N << "\\n";
    std::cout << "max popcount in 0..N      " << best << " at " << bestAt << "\\n";
}`,
          },
        ],
      },
    },
  },
  {
    title: `How do you find the single number where every other element appears twice?`,
    difficulty: "easy",
    seoDescription: `Find the one number that appears once when every other appears twice: XOR in O(n) time and O(1) space, in Python, JavaScript, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"You get a non-empty list of integers in which every value appears exactly twice except one, which appears once. Write a Python function that returns that single value. Can you do it in linear time and constant extra space?"

**What a strong answer should cover:**
- The baseline answers first: nested scan O(n²), a \`dict\`/\`collections.Counter\` of counts O(n) time and O(n) space, sorting O(n log n).
- XOR: \`a ^ a == 0\` and \`a ^ 0 == a\`, and XOR is commutative and associative, so XOR-ing everything leaves the single number.
- O(n) time, O(1) extra space, and why O(n) is the best possible.
- Python details: \`^\` is XOR (power is \`**\`), \`functools.reduce(operator.xor, nums, 0)\` is the one-liner, and Python ints are unbounded so negatives behave like an infinite run of sign bits.
- The follow-ups: three-times (count bits mod 3, then convert bit 31 back to a negative number in Python) and two singles (split on the lowest set bit).

**Clarifying questions expected:**
- Is it guaranteed that every other value appears exactly twice?
- Is O(n) extra memory allowed, or must it be O(1)?

**Code / implementation expected:** Yes — a one-pass XOR function in Python 3, optionally with the \`Counter\` version for comparison.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know arrays and loops in Python; binary and XOR are explained from scratch.  
**Difficulty:** Easy  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You empty a laundry basket onto the bed. Every sock has a twin, except one. The slow way is to pick up a sock and search the whole pile for its partner, again and again. A faster way is to keep a list of "socks I have seen once": add a sock when it first shows up, cross it off when its twin appears, and the one name left on the list is the odd sock. That works, but the list can get long.

Now imagine a single light switch instead of a list. Every time you see a sock, you flip a switch labelled with that sock's colour. A colour seen twice is flipped twice, so it ends up back where it started. Only the odd sock's switch stays flipped. Numbers already come with a row of tiny switches — their binary bits — and the operation that flips them is **XOR**. That is the whole trick: XOR every number together and the pairs switch themselves off.

Interviewers like this question because the obvious answers (search, or a hash map) are easy, and the best answer needs one fact about bits that many candidates have never thought about. It is also the doorway to a family of follow-ups: every other number appears three times, two numbers are single, or one number is missing from 0..n.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is it guaranteed that exactly one number appears once and every other appears exactly twice? | XOR only works under that promise. If some number could appear three times, XOR returns garbage. |
| Can I use extra memory? | A hash map is O(n) extra space. The follow-up usually demands O(1) extra space, which is what forces XOR. |
| Can the array be modified? | Sorting in place uses no extra array but changes the input and costs O(n log n). |
| Can the numbers be negative, or larger than 32 bits? | XOR handles negatives, but in some languages bitwise operators truncate to 32 bits. |
| Is the array ever empty? | With no single number the question has no answer; XOR would return 0, which might be mistaken for a real answer. |

## 3. The One Fact You Need: XOR

**XOR** ("exclusive or") compares two bits and outputs 1 when they are *different*, 0 when they are the *same*. On whole numbers it does that for every bit position at once: \`6 ^ 3\` is \`110 ^ 011 = 101\`, which is 5.

📌 **Interview term: XOR (exclusive or)** — a bitwise operation whose result bit is 1 exactly when the two input bits differ. Written \`^\` in Python, JavaScript, Java and C++.

Four properties make XOR perfect for this problem:

| Property | In symbols | Why it helps |
| :--- | :--- | :--- |
| A number cancels itself | \`a ^ a = 0\` | every pair disappears |
| Zero changes nothing | \`a ^ 0 = a\` | start the running result at 0, and what survives is the single number |
| Order does not matter | \`a ^ b = b ^ a\` | the twins do not need to be next to each other |
| Grouping does not matter | \`(a ^ b) ^ c = a ^ (b ^ c)\` | we can XOR left to right in one pass |

📌 **Interview term: Commutative and associative** — an operation is commutative if swapping the inputs gives the same result, and associative if regrouping them does. Together they mean the order of a long XOR chain does not matter.

Because order and grouping do not matter, XOR-ing the whole array is the same as first lining up every pair next to its twin:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="The array 4 1 2 1 2 regrouped: 1 xor 1 is 0, 2 xor 2 is 0, and 4 is left, so the answer is 4">
  <defs>
    <marker id="b33q3-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="140" height="50" rx="8"/>
  <text class="d-text" x="110" y="61" text-anchor="middle">1 ^ 1</text>
  <rect class="d-box" x="250" y="30" width="140" height="50" rx="8"/>
  <text class="d-text" x="320" y="61" text-anchor="middle">2 ^ 2</text>
  <rect class="d-box" x="460" y="30" width="140" height="50" rx="8"/>
  <text class="d-text" x="530" y="61" text-anchor="middle">4</text>
  <path class="d-edge" d="M 110 82 L 110 124" marker-end="url(#b33q3-a1)"/>
  <path class="d-edge" d="M 320 82 L 320 124" marker-end="url(#b33q3-a1)"/>
  <path class="d-edge" d="M 530 82 L 530 124" marker-end="url(#b33q3-a1)"/>
  <rect class="d-box-muted" x="40" y="130" width="140" height="50" rx="8"/>
  <text class="d-text" x="110" y="161" text-anchor="middle">0</text>
  <text class="d-text" x="215" y="161" text-anchor="middle">^</text>
  <rect class="d-box-muted" x="250" y="130" width="140" height="50" rx="8"/>
  <text class="d-text" x="320" y="161" text-anchor="middle">0</text>
  <text class="d-text" x="425" y="161" text-anchor="middle">^</text>
  <rect class="d-box-accent" x="460" y="130" width="140" height="50" rx="8"/>
  <text class="d-text" x="530" y="161" text-anchor="middle">4 = answer</text>
</svg>

The pairs turn into zeros and the zeros change nothing, so the single number is all that is left. The computer never actually regroups anything; it just walks the array once, and the running result passes through intermediate values that look random until the last step:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Running XOR over 4 1 2 1 2: the accumulator goes 100, 101, 111, 110, 100, ending at 4">
  <defs>
    <marker id="b33q3-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="25" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="80" y="56" text-anchor="middle">x = 4</text>
  <text class="d-sub" x="80" y="80" text-anchor="middle">100</text>
  <rect class="d-box" x="175" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="230" y="56" text-anchor="middle">x = 1</text>
  <text class="d-sub" x="230" y="80" text-anchor="middle">001</text>
  <rect class="d-box" x="325" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="380" y="56" text-anchor="middle">x = 2</text>
  <text class="d-sub" x="380" y="80" text-anchor="middle">010</text>
  <rect class="d-box" x="475" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="530" y="56" text-anchor="middle">x = 1</text>
  <text class="d-sub" x="530" y="80" text-anchor="middle">001</text>
  <rect class="d-box" x="625" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="680" y="56" text-anchor="middle">x = 2</text>
  <text class="d-sub" x="680" y="80" text-anchor="middle">010</text>
  <path class="d-edge" d="M 80 96 L 80 130" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge" d="M 230 96 L 230 130" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge" d="M 380 96 L 380 130" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge" d="M 530 96 L 530 130" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge" d="M 680 96 L 680 130" marker-end="url(#b33q3-a2)"/>
  <rect class="d-box-muted" x="25" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="80" y="162" text-anchor="middle">acc 4</text>
  <text class="d-sub" x="80" y="186" text-anchor="middle">100</text>
  <rect class="d-box-muted" x="175" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="230" y="162" text-anchor="middle">acc 5</text>
  <text class="d-sub" x="230" y="186" text-anchor="middle">101</text>
  <rect class="d-box-muted" x="325" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="380" y="162" text-anchor="middle">acc 7</text>
  <text class="d-sub" x="380" y="186" text-anchor="middle">111</text>
  <rect class="d-box-muted" x="475" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="530" y="162" text-anchor="middle">acc 6</text>
  <text class="d-sub" x="530" y="186" text-anchor="middle">110</text>
  <rect class="d-box-accent" x="625" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="680" y="162" text-anchor="middle">acc 4</text>
  <text class="d-sub" x="680" y="186" text-anchor="middle">100</text>
  <path class="d-edge-dashed" d="M 137 168 L 171 168" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge-dashed" d="M 287 168 L 321 168" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge-dashed" d="M 437 168 L 471 168" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge-dashed" d="M 587 168 L 621 168" marker-end="url(#b33q3-a2)"/>
</svg>

The accumulator starts at 0 and each number is XOR-ed into it. Look at each bit column on its own: the column flips once for every number that has a 1 there. Columns flipped an even number of times end at 0; only the single number's 1 bits are flipped an odd number of times. Example 1 prints exactly this trace.

## 4. From Brute Force to XOR

There are five reasonable answers, and walking through them in order is a good way to show the interviewer you understand the trade-offs.

1. **Brute force.** For each number, scan the whole array and count how often it appears; return the one with count 1. O(n²) time, O(1) extra space. On a 2,001-number array, example 2 makes **2,593,296** comparisons.
2. **Hash map of counts.** One pass to count, one pass over the counts. O(n) time, but O(n) extra space: 1,001 entries for the same array. See [how a hash table works](/interview-question/how-does-a-hash-table-work).
3. **Sort, then check neighbours.** After sorting, twins sit side by side, so step through two at a time until a pair does not match. O(n log n) time; O(1) extra space if you may sort the input in place.
4. **Sum trick.** \`2 * sum(distinct values) - sum(all values)\` counts every paired value twice in both terms and the single value once more on the left. O(n) time, but building the set of distinct values is O(n) space, and the sums can overflow fixed-size integers.
5. **XOR everything.** One pass, one variable: O(n) time, O(1) extra space, no overflow possible because XOR never produces a bit that was not already in range.

📌 **Interview term: Extra space (auxiliary space)** — memory an algorithm uses on top of its input. The XOR solution uses one integer, O(1); the hash map uses O(n). See [space complexity](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

📌 **Interview term: Bitwise operation** — an operation that works on each bit position of an integer independently, such as AND \`&\`, OR \`|\`, XOR \`^\` and NOT \`~\`.

## 5. The Code in Python

~~~python
def single_number(nums):
    """XOR everything: pairs cancel (a ^ a = 0), and 0 ^ x = x."""
    result = 0
    for x in nums:
        result ^= x
    return result
~~~

**What to point out in this code:**

- \`result ^= x\` is the whole algorithm. Starting at \`0\` matters: it is the "zero changes nothing" property, and it makes an empty list return 0 instead of crashing.
- In Python \`^\` is XOR, not "to the power of" (that is \`**\`). \`2 ^ 3\` is 1, not 8.
- The one-liner is \`functools.reduce(operator.xor, nums, 0)\`. Pass the third argument: without an initial value, \`reduce\` raises \`TypeError\` on an empty list.
- Python integers have no fixed width. A negative int behaves as if it had infinitely many 1 bits on the left, so \`-3 ^ 7 ^ 7\` is still \`-3\` with no special handling (example 1).
- The readable O(n)-space version is \`collections.Counter(nums)\` followed by the key whose count is 1. Mention it, then say XOR does the same job in one integer.

~~~python
from collections import Counter

def single_number_counter(nums):
    return next(x for x, c in Counter(nums).items() if c == 1)  # O(n) time, O(n) space
~~~

## 6. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — XOR on six inputs, then the running XOR traced bit by bit** prints:

~~~text
1
4
1
-3
5
8
^ 4 -> 100 (4)
^ 1 -> 101 (5)
^ 2 -> 111 (7)
^ 1 -> 110 (6)
^ 2 -> 100 (4)
~~~

The trace matches the second diagram: the accumulator passes through 5, 7 and 6 before landing on 4.

**Example 2 — five approaches on the same shuffled 2,001-number list, with a work counter for each** prints:

~~~text
n = 2001
brute force: 10012  comparisons 2593296
hash map:    10012  entries 1001
sort:        10012  pairs checked 1000
sum trick:   10012  sum(all) 10031060
xor:         10012  xor operations 2001
~~~

All five agree on 10012. Brute force needs over 2.5 million comparisons where XOR needs 2,001 operations, and the dict needs 1,001 entries where XOR needs one integer.

**Example 3 — the follow-ups: three times (two ways) and two singles** prints:

~~~text
3
99
-4
-4
[3, 5]
[-1, 0]
[7, 12]
~~~

Both three-times versions return -4 for the list with negatives, which only works because of the sign fix shown above.

## Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | a full scan for every element |
| Hash map of counts | O(n) | O(n) | one entry per distinct value |
| Sort + neighbours | O(n log n) | O(1) to O(n) | the sort dominates; in-place sort needs no array copy |
| Sum trick | O(n) | O(n) | the set of distinct values |
| **XOR** | **O(n)** | **O(1)** | one pass, one integer |
| Three-times follow-up (bit counting) | O(32·n) = O(n) | O(1) | 32 passes over the bits, or one pass with the ones/twos masks |
| Two-singles follow-up | O(n) | O(1) | two passes |

O(n) is also the lower bound: any algorithm must look at every element at least once, because the one it skips could be the single number. See [Big-O notation](/interview-question/what-is-big-o-notation) for what these labels mean.

## The Classic Follow-Ups

**"Every other number appears three times."** XOR fails, because \`a ^ a ^ a = a\`. Go back to the bit-column view: for each of the 32 bit positions, add up that bit over all numbers. Numbers that appear three times contribute 0 or 3 to every column, so \`column total % 3\` is exactly the single number's bit. Example 3 does this and also shows the compact two-mask version (\`ones\` and \`twos\` hold each bit's count mod 3).

📌 **Interview term: Bit counting mod k** — summing each bit position over all numbers and taking the total mod k; it finds the one number that appears a different number of times than all the others.

**"Exactly two numbers appear once."** XOR everything to get \`a ^ b\`. It is not zero (a and b differ), so it has at least one 1 bit, and at that bit a and b disagree. Take the lowest one, \`low = both & -both\`, and XOR again, but only the numbers that have that bit set: pairs still cancel, and only one of a, b is in that group. The other is \`both ^ a\`.

📌 **Interview term: Lowest set bit** — \`x & -x\` keeps only the lowest 1 bit of x (for 44 = 101100 it is 4 = 000100), because in two's complement \`-x\` is \`~x + 1\`. More tricks like it are on [the bit manipulation tricks page](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews).

**"One number from 0..n is missing."** XOR all the indices 0..n with all the values; every present number cancels with its index and the missing one survives. That is [the missing number question](/interview-question/how-do-you-find-the-missing-number-in-0-n). Related: [finding a duplicate](/interview-question/how-do-you-find-a-duplicate-in-an-array) and the [majority element](/interview-question/how-do-you-find-the-majority-element), which look similar but need different tricks.

**Python's catch in the three-times follow-up.** Bit counting builds the answer bit by bit, from bit 0 to bit 31. If the answer is negative, its bit 31 is set, and in Python that just makes a big positive number: without a fix, the input in example 3 returns **4294967292** instead of -4. Convert from the 32-bit pattern at the end:

~~~python
def single_of_three(nums):
    """Count each of the 32 bit positions mod 3; the leftover bits are the answer."""
    result = 0
    for bit in range(32):
        total = sum((x >> bit) & 1 for x in nums)
        if total % 3:
            result |= 1 << bit
    # Python ints are unbounded: bit 31 set means the 32-bit answer was negative.
    return result - (1 << 32) if result >= 1 << 31 else result
~~~

The two-mask version (\`ones\`/\`twos\`) does not have this problem in Python, because it never builds bit 31 on its own: it XORs whole numbers, negatives included.

## Edge Cases

- **One element** (\`[1]\`): the loop runs once and returns it.
- **Negative numbers** (\`[-3, 7, 7]\`): XOR works on the two's complement bit pattern, so -3 comes out unchanged.
- **Zero as a paired value** (\`[0, 5, 0]\`): 0 cancels like any other number; 5 is returned.
- **Zero as the single value** (\`[0, 4, 4]\`): returns 0, which is correct; but it is also what an empty array returns, so validate input if empty arrays are possible.
- **Input that breaks the promise** (some number three times): XOR silently returns a wrong value. Ask first; do not assume.
- **Very large values**: see the language notes on integer width below.

## Common Pitfalls

- **Confusing \`^\` with power.** \`x ^ 2\` is XOR with 2 in Python, not x squared.
- **\`reduce\` without an initial value.** \`reduce(operator.xor, [])\` raises \`TypeError\`; \`reduce(operator.xor, [], 0)\` returns 0.
- **Using \`nums.count(x)\` in a loop.** It reads like one line but it is the O(n²) brute force: \`list.count\` scans the whole list every time.
- **Forgetting the 32-bit sign fix in the three-times version.** Building bit 31 with \`|=\` gives 4294967292 instead of -4 (example 3).
- **Assuming XOR works when a value appears three times.** \`a ^ a ^ a == a\`; the promise "every other value appears exactly twice" is essential.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Counter</code> of the list works in O(n) time but O(n) extra space; a nested scan is O(n²).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Key fact:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ a == 0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ 0 == a</code>, and XOR is commutative and associative.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result = 0</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result ^= x</code> for every x; the pairs cancel and the single value remains.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) extra space, and nobody can beat O(n) because every element must be read.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python notes:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">^</code> is XOR, not power; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reduce(operator.xor, nums, 0)</code> is the one-liner; ints are unbounded, so negatives just work.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if every other number appears three times?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count each of the 32 bit positions mod 3 and rebuild the answer. In Python, subtract <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 &lt;&lt; 32</code> if bit 31 is set, or a negative answer comes back as a large positive.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if two numbers appear once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">XOR all to get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ b</code>, take its lowest set bit with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">both &amp; -both</code>, and XOR only the numbers that have that bit. That gives one of them; the other is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">both ^ a</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not the sum trick, <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">2 * sum(set(nums)) - sum(nums)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is correct in Python because ints never overflow, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set(nums)</code> is O(n) extra space, so it loses to XOR on memory.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does XOR work with negative numbers in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Python treats a negative int as having infinitely many leading 1 bits, and XOR cancels those just like any other bits; example 1 returns -3 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-3, 7, 7]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the order of the list important?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. XOR is commutative and associative, so the twins can be anywhere; the running value only looks random in the middle.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **XOR (exclusive or)** | Bitwise operation: 1 where the two bits differ, 0 where they match |
| **Commutative and associative** | Order and grouping of the operands do not change the result |
| **Extra space (auxiliary space)** | Memory used beyond the input itself |
| **Bitwise operation** | An operation applied to each bit position independently |
| **Bit counting mod k** | Sum each bit position over all numbers and take it mod k |
| **Lowest set bit** | \`x & -x\`: only the lowest 1 bit of x |

---
**Conclusion:** Every value that appears twice cancels itself under XOR, and zero changes nothing, so one pass of \`result ^= x\` leaves the single number: O(n) time and one integer of extra space, against O(n) memory for a \`Counter\` and O(n²) time for a nested scan. In Python, remember that \`^\` is XOR rather than power, give \`reduce\` its initial \`0\`, and in the three-times follow-up convert bit 31 back into a negative number, because Python ints have no fixed width.`,
        examples: [
          {
            label: `single_number with XOR, plus a trace of the running value`,
            code: `from functools import reduce
from operator import xor


def single_number(nums):
    """XOR everything: pairs cancel (a ^ a = 0), and 0 ^ x = x."""
    result = 0
    for x in nums:
        result ^= x
    return result


def single_number_reduce(nums):
    return reduce(xor, nums, 0)  # same thing, one line


print(single_number([2, 2, 1]))  # 1
print(single_number([4, 1, 2, 1, 2]))  # 4
print(single_number([1]))  # 1
print(single_number([-3, 7, 7]))  # -3
print(single_number([0, 5, 0]))  # 5
print(single_number_reduce([9, 3, 9, 8, 3]))  # 8

# Trace the running XOR on [4, 1, 2, 1, 2].
nums = [4, 1, 2, 1, 2]
acc = 0
for x in nums:
    acc ^= x
    print("^ " + str(x) + " -> " + format(acc, "03b") + " (" + str(acc) + ")")`,
          },
          {
            label: `Brute force vs dict vs sort vs sum vs XOR, with work counters`,
            code: `# Five ways to find the single number, with a work counter for each.


def build(pairs, single, seed):
    nums = []
    for i in range(1, pairs + 1):
        v = i * 7919 % 10007  # 1000 distinct values
        nums += [v, v]
    nums.append(single)
    for i in range(len(nums) - 1, 0, -1):  # Fisher-Yates with a fixed LCG
        seed = seed * 48271 % 2147483647
        j = seed % (i + 1)
        nums[i], nums[j] = nums[j], nums[i]
    return nums


nums = build(1000, 10012, 7)
n = len(nums)
print("n = " + str(n))

# 1. Brute force: count each value by scanning the whole list. O(n^2) time.
comparisons = 0
brute = None
for x in nums:
    count = 0
    for y in nums:
        comparisons += 1
        if x == y:
            count += 1
    if count == 1:
        brute = x
        break
print("brute force: " + str(brute) + "  comparisons " + str(comparisons))

# 2. Hash map of counts. O(n) time, O(n) extra space.
counts = {}
for x in nums:
    counts[x] = counts.get(x, 0) + 1
hashed = next(x for x, c in counts.items() if c == 1)
print("hash map:    " + str(hashed) + "  entries " + str(len(counts)))

# 3. Sort, then compare neighbours two at a time. O(n log n) time.
s = sorted(nums)
i = 0
while i + 1 < len(s) and s[i] == s[i + 1]:
    i += 2
print("sort:        " + str(s[i]) + "  pairs checked " + str(i // 2))

# 4. Math: 2 * sum(distinct) - sum(all). O(n) time, O(n) space for the set.
math_answer = 2 * sum(set(nums)) - sum(nums)
print("sum trick:   " + str(math_answer) + "  sum(all) " + str(sum(nums)))

# 5. XOR. O(n) time, O(1) extra space.
acc = 0
for x in nums:
    acc ^= x
print("xor:         " + str(acc) + "  xor operations " + str(n))`,
          },
          {
            label: `Follow-ups: every other value three times, and two single values`,
            code: `# Follow-ups: every other number appears THREE times, or TWO numbers are single.


def single_of_three(nums):
    """Count each of the 32 bit positions mod 3; the leftover bits are the answer."""
    result = 0
    for bit in range(32):
        total = sum((x >> bit) & 1 for x in nums)
        if total % 3:
            result |= 1 << bit
    # Python ints are unbounded: bit 31 set means the 32-bit answer was negative.
    return result - (1 << 32) if result >= 1 << 31 else result


def single_of_three_states(nums):
    """Same idea with two bitmasks: ones/twos hold the count mod 3 of every bit."""
    ones = twos = 0
    for x in nums:
        ones = (ones ^ x) & ~twos
        twos = (twos ^ x) & ~ones
    return ones


def two_singles(nums):
    """XOR all = a ^ b. Its lowest 1 bit is a bit where a and b differ: split on it."""
    both = 0
    for x in nums:
        both ^= x
    low = both & -both
    a = 0
    for x in nums:
        if x & low:
            a ^= x
    b = both ^ a
    return "[" + str(min(a, b)) + ", " + str(max(a, b)) + "]"


print(single_of_three([2, 2, 3, 2]))  # 3
print(single_of_three([0, 1, 0, 1, 0, 1, 99]))  # 99
print(single_of_three([-2, -2, 1, 1, -3, 1, -3, -3, -4, -2]))  # -4
print(single_of_three_states([-2, -2, 1, 1, -3, 1, -3, -3, -4, -2]))  # -4
print(two_singles([1, 2, 1, 3, 2, 5]))  # [3, 5]
print(two_singles([-1, 0]))  # [-1, 0]
print(two_singles([4, 7, 4, 9, 9, 12]))  # [7, 12]`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"You get a non-empty array of integers in which every value appears exactly twice except one, which appears once. Write a JavaScript function that returns that single value, in linear time and constant extra space."

**What a strong answer should cover:**
- The baselines: nested loops O(n²), a \`Map\` of counts O(n) time and O(n) space, sorting O(n log n) (with a numeric comparator).
- XOR: \`a ^ a === 0\` and \`a ^ 0 === a\`, commutative and associative, so XOR-ing everything leaves the single number.
- O(n) time, O(1) extra space, and why O(n) is a lower bound.
- JavaScript details: \`^\` converts both operands to 32-bit signed integers, so it is only correct for values that fit in int32; beyond that, use \`BigInt\` (\`5n ^ 3n\`). \`reduce\` needs the initial \`0\` for an empty array.
- The follow-ups: three-times (count bits mod 3) and two singles (split on \`both & -both\`).

**Clarifying questions expected:**
- Is it guaranteed that every other value appears exactly twice?
- What range can the values take? (Above 2^31, \`^\` on plain numbers truncates.)

**Code / implementation expected:** Yes — a one-pass XOR function in JavaScript, optionally a \`Map\` version for comparison.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know arrays and loops in JavaScript; binary and XOR are explained from scratch.  
**Difficulty:** Easy  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You empty a laundry basket onto the bed. Every sock has a twin, except one. The slow way is to pick up a sock and search the whole pile for its partner, again and again. A faster way is to keep a list of "socks I have seen once": add a sock when it first shows up, cross it off when its twin appears, and the one name left on the list is the odd sock. That works, but the list can get long.

Now imagine a single light switch instead of a list. Every time you see a sock, you flip a switch labelled with that sock's colour. A colour seen twice is flipped twice, so it ends up back where it started. Only the odd sock's switch stays flipped. Numbers already come with a row of tiny switches — their binary bits — and the operation that flips them is **XOR**. That is the whole trick: XOR every number together and the pairs switch themselves off.

Interviewers like this question because the obvious answers (search, or a hash map) are easy, and the best answer needs one fact about bits that many candidates have never thought about. It is also the doorway to a family of follow-ups: every other number appears three times, two numbers are single, or one number is missing from 0..n.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is it guaranteed that exactly one number appears once and every other appears exactly twice? | XOR only works under that promise. If some number could appear three times, XOR returns garbage. |
| Can I use extra memory? | A hash map is O(n) extra space. The follow-up usually demands O(1) extra space, which is what forces XOR. |
| Can the array be modified? | Sorting in place uses no extra array but changes the input and costs O(n log n). |
| Can the numbers be negative, or larger than 32 bits? | XOR handles negatives, but in some languages bitwise operators truncate to 32 bits. |
| Is the array ever empty? | With no single number the question has no answer; XOR would return 0, which might be mistaken for a real answer. |

## 3. The One Fact You Need: XOR

**XOR** ("exclusive or") compares two bits and outputs 1 when they are *different*, 0 when they are the *same*. On whole numbers it does that for every bit position at once: \`6 ^ 3\` is \`110 ^ 011 = 101\`, which is 5.

📌 **Interview term: XOR (exclusive or)** — a bitwise operation whose result bit is 1 exactly when the two input bits differ. Written \`^\` in Python, JavaScript, Java and C++.

Four properties make XOR perfect for this problem:

| Property | In symbols | Why it helps |
| :--- | :--- | :--- |
| A number cancels itself | \`a ^ a = 0\` | every pair disappears |
| Zero changes nothing | \`a ^ 0 = a\` | start the running result at 0, and what survives is the single number |
| Order does not matter | \`a ^ b = b ^ a\` | the twins do not need to be next to each other |
| Grouping does not matter | \`(a ^ b) ^ c = a ^ (b ^ c)\` | we can XOR left to right in one pass |

📌 **Interview term: Commutative and associative** — an operation is commutative if swapping the inputs gives the same result, and associative if regrouping them does. Together they mean the order of a long XOR chain does not matter.

Because order and grouping do not matter, XOR-ing the whole array is the same as first lining up every pair next to its twin:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="The array 4 1 2 1 2 regrouped: 1 xor 1 is 0, 2 xor 2 is 0, and 4 is left, so the answer is 4">
  <defs>
    <marker id="b33q3-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="140" height="50" rx="8"/>
  <text class="d-text" x="110" y="61" text-anchor="middle">1 ^ 1</text>
  <rect class="d-box" x="250" y="30" width="140" height="50" rx="8"/>
  <text class="d-text" x="320" y="61" text-anchor="middle">2 ^ 2</text>
  <rect class="d-box" x="460" y="30" width="140" height="50" rx="8"/>
  <text class="d-text" x="530" y="61" text-anchor="middle">4</text>
  <path class="d-edge" d="M 110 82 L 110 124" marker-end="url(#b33q3-a1)"/>
  <path class="d-edge" d="M 320 82 L 320 124" marker-end="url(#b33q3-a1)"/>
  <path class="d-edge" d="M 530 82 L 530 124" marker-end="url(#b33q3-a1)"/>
  <rect class="d-box-muted" x="40" y="130" width="140" height="50" rx="8"/>
  <text class="d-text" x="110" y="161" text-anchor="middle">0</text>
  <text class="d-text" x="215" y="161" text-anchor="middle">^</text>
  <rect class="d-box-muted" x="250" y="130" width="140" height="50" rx="8"/>
  <text class="d-text" x="320" y="161" text-anchor="middle">0</text>
  <text class="d-text" x="425" y="161" text-anchor="middle">^</text>
  <rect class="d-box-accent" x="460" y="130" width="140" height="50" rx="8"/>
  <text class="d-text" x="530" y="161" text-anchor="middle">4 = answer</text>
</svg>

The pairs turn into zeros and the zeros change nothing, so the single number is all that is left. The computer never actually regroups anything; it just walks the array once, and the running result passes through intermediate values that look random until the last step:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Running XOR over 4 1 2 1 2: the accumulator goes 100, 101, 111, 110, 100, ending at 4">
  <defs>
    <marker id="b33q3-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="25" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="80" y="56" text-anchor="middle">x = 4</text>
  <text class="d-sub" x="80" y="80" text-anchor="middle">100</text>
  <rect class="d-box" x="175" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="230" y="56" text-anchor="middle">x = 1</text>
  <text class="d-sub" x="230" y="80" text-anchor="middle">001</text>
  <rect class="d-box" x="325" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="380" y="56" text-anchor="middle">x = 2</text>
  <text class="d-sub" x="380" y="80" text-anchor="middle">010</text>
  <rect class="d-box" x="475" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="530" y="56" text-anchor="middle">x = 1</text>
  <text class="d-sub" x="530" y="80" text-anchor="middle">001</text>
  <rect class="d-box" x="625" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="680" y="56" text-anchor="middle">x = 2</text>
  <text class="d-sub" x="680" y="80" text-anchor="middle">010</text>
  <path class="d-edge" d="M 80 96 L 80 130" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge" d="M 230 96 L 230 130" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge" d="M 380 96 L 380 130" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge" d="M 530 96 L 530 130" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge" d="M 680 96 L 680 130" marker-end="url(#b33q3-a2)"/>
  <rect class="d-box-muted" x="25" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="80" y="162" text-anchor="middle">acc 4</text>
  <text class="d-sub" x="80" y="186" text-anchor="middle">100</text>
  <rect class="d-box-muted" x="175" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="230" y="162" text-anchor="middle">acc 5</text>
  <text class="d-sub" x="230" y="186" text-anchor="middle">101</text>
  <rect class="d-box-muted" x="325" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="380" y="162" text-anchor="middle">acc 7</text>
  <text class="d-sub" x="380" y="186" text-anchor="middle">111</text>
  <rect class="d-box-muted" x="475" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="530" y="162" text-anchor="middle">acc 6</text>
  <text class="d-sub" x="530" y="186" text-anchor="middle">110</text>
  <rect class="d-box-accent" x="625" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="680" y="162" text-anchor="middle">acc 4</text>
  <text class="d-sub" x="680" y="186" text-anchor="middle">100</text>
  <path class="d-edge-dashed" d="M 137 168 L 171 168" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge-dashed" d="M 287 168 L 321 168" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge-dashed" d="M 437 168 L 471 168" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge-dashed" d="M 587 168 L 621 168" marker-end="url(#b33q3-a2)"/>
</svg>

The accumulator starts at 0 and each number is XOR-ed into it. Look at each bit column on its own: the column flips once for every number that has a 1 there. Columns flipped an even number of times end at 0; only the single number's 1 bits are flipped an odd number of times. Example 1 prints exactly this trace.

## 4. From Brute Force to XOR

There are five reasonable answers, and walking through them in order is a good way to show the interviewer you understand the trade-offs.

1. **Brute force.** For each number, scan the whole array and count how often it appears; return the one with count 1. O(n²) time, O(1) extra space. On a 2,001-number array, example 2 makes **2,593,296** comparisons.
2. **Hash map of counts.** One pass to count, one pass over the counts. O(n) time, but O(n) extra space: 1,001 entries for the same array. See [how a hash table works](/interview-question/how-does-a-hash-table-work).
3. **Sort, then check neighbours.** After sorting, twins sit side by side, so step through two at a time until a pair does not match. O(n log n) time; O(1) extra space if you may sort the input in place.
4. **Sum trick.** \`2 * sum(distinct values) - sum(all values)\` counts every paired value twice in both terms and the single value once more on the left. O(n) time, but building the set of distinct values is O(n) space, and the sums can overflow fixed-size integers.
5. **XOR everything.** One pass, one variable: O(n) time, O(1) extra space, no overflow possible because XOR never produces a bit that was not already in range.

📌 **Interview term: Extra space (auxiliary space)** — memory an algorithm uses on top of its input. The XOR solution uses one integer, O(1); the hash map uses O(n). See [space complexity](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

📌 **Interview term: Bitwise operation** — an operation that works on each bit position of an integer independently, such as AND \`&\`, OR \`|\`, XOR \`^\` and NOT \`~\`.

## 5. The Code in JavaScript

~~~javascript
function singleNumber(nums) {
  // XOR everything: pairs cancel (a ^ a = 0), and 0 ^ x = x.
  let result = 0;
  for (const x of nums) result ^= x;
  return result;
}
~~~

**What to point out in this code:**

- \`result ^= x\` is the whole algorithm, and starting at \`0\` is the "zero changes nothing" property.
- **Every JavaScript bitwise operator works on 32-bit integers.** A Number is a 64-bit float, but \`^\`, \`&\`, \`|\`, \`~\`, \`<<\` and \`>>\` first convert both sides to a 32-bit signed integer and return one ([MDN: Bitwise AND](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_AND)). For LeetCode-style inputs that is fine; for values beyond ±2^31 it silently drops the high bits: in our run, \`(2 ** 32 + 5) | 0\` printed \`5\`.
- For bigger values, use \`BigInt\`: \`nums.reduce((a, x) => a ^ x, 0n)\` with BigInt elements. BigInt XOR has no 32-bit truncation, and mixing BigInt and Number in one \`^\` throws \`TypeError\`.
- \`nums.reduce((acc, x) => acc ^ x, 0)\` is the one-liner. Keep the \`0\`: \`[].reduce(fn)\` with no initial value throws \`TypeError\`.
- The readable O(n)-space version uses a \`Map\` (not a plain object: object keys are strings, so \`1\` and \`'1'\` would collide, and a Map keeps number keys as numbers).

~~~javascript
function singleNumberMap(nums) {
  const counts = new Map();
  for (const x of nums) counts.set(x, (counts.get(x) || 0) + 1);
  for (const [x, c] of counts) if (c === 1) return x; // O(n) time, O(n) space
}
~~~

## 6. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — XOR on six inputs, then the running XOR traced bit by bit** prints:

~~~text
1
4
1
-3
5
8
^ 4 -> 100 (4)
^ 1 -> 101 (5)
^ 2 -> 111 (7)
^ 1 -> 110 (6)
^ 2 -> 100 (4)
~~~

The trace matches the second diagram: the accumulator passes through 5, 7 and 6 before landing on 4.

**Example 2 — five approaches on the same shuffled 2,001-number array, with a work counter for each** prints:

~~~text
n = 2001
brute force: 10012  comparisons 2593296
hash map:    10012  entries 1001
sort:        10012  pairs checked 1000
sum trick:   10012  sum(all) 10031060
xor:         10012  xor operations 2001
~~~

All five agree on 10012. Brute force needs over 2.5 million comparisons where XOR needs 2,001 operations. Note the sort uses \`(a, b) => a - b\`: the default \`sort()\` compares numbers as strings.

**Example 3 — the follow-ups: three times (two ways) and two singles** prints:

~~~text
3
99
-4
-4
[3, 5]
[-1, 0]
[7, 12]
~~~

The answer -4 comes out negative on its own, because \`|=\` produces a signed 32-bit integer.

## Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | a full scan for every element |
| Hash map of counts | O(n) | O(n) | one entry per distinct value |
| Sort + neighbours | O(n log n) | O(1) to O(n) | the sort dominates; in-place sort needs no array copy |
| Sum trick | O(n) | O(n) | the set of distinct values |
| **XOR** | **O(n)** | **O(1)** | one pass, one integer |
| Three-times follow-up (bit counting) | O(32·n) = O(n) | O(1) | 32 passes over the bits, or one pass with the ones/twos masks |
| Two-singles follow-up | O(n) | O(1) | two passes |

O(n) is also the lower bound: any algorithm must look at every element at least once, because the one it skips could be the single number. See [Big-O notation](/interview-question/what-is-big-o-notation) for what these labels mean.

## The Classic Follow-Ups

**"Every other number appears three times."** XOR fails, because \`a ^ a ^ a = a\`. Go back to the bit-column view: for each of the 32 bit positions, add up that bit over all numbers. Numbers that appear three times contribute 0 or 3 to every column, so \`column total % 3\` is exactly the single number's bit. Example 3 does this and also shows the compact two-mask version (\`ones\` and \`twos\` hold each bit's count mod 3).

📌 **Interview term: Bit counting mod k** — summing each bit position over all numbers and taking the total mod k; it finds the one number that appears a different number of times than all the others.

**"Exactly two numbers appear once."** XOR everything to get \`a ^ b\`. It is not zero (a and b differ), so it has at least one 1 bit, and at that bit a and b disagree. Take the lowest one, \`low = both & -both\`, and XOR again, but only the numbers that have that bit set: pairs still cancel, and only one of a, b is in that group. The other is \`both ^ a\`.

📌 **Interview term: Lowest set bit** — \`x & -x\` keeps only the lowest 1 bit of x (for 44 = 101100 it is 4 = 000100), because in two's complement \`-x\` is \`~x + 1\`. More tricks like it are on [the bit manipulation tricks page](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews).

**"One number from 0..n is missing."** XOR all the indices 0..n with all the values; every present number cancels with its index and the missing one survives. That is [the missing number question](/interview-question/how-do-you-find-the-missing-number-in-0-n). Related: [finding a duplicate](/interview-question/how-do-you-find-a-duplicate-in-an-array) and the [majority element](/interview-question/how-do-you-find-the-majority-element), which look similar but need different tricks.

**The three-times follow-up in JavaScript.** Bit counting builds the answer with \`result |= 1 << bit\`. Because \`|\` returns a 32-bit signed int, setting bit 31 automatically makes the result negative, which is exactly right: example 3 returns -4 with no extra conversion.

~~~javascript
function singleOfThree(nums) {
  // Count each of the 32 bit positions mod 3; the leftover bits are the answer.
  let result = 0;
  for (let bit = 0; bit < 32; bit++) {
    let total = 0;
    for (const x of nums) total += (x >> bit) & 1;
    if (total % 3) result |= 1 << bit; // |= gives an int32, so bit 31 makes it negative
  }
  return result;
}
~~~

Use \`x >> bit\` (arithmetic shift) or \`x >>> bit\` (logical shift) here; both give the right bit after \`& 1\` for bit positions 0 to 31.

## Edge Cases

- **One element** (\`[1]\`): the loop runs once and returns it.
- **Negative numbers** (\`[-3, 7, 7]\`): XOR works on the two's complement bit pattern, so -3 comes out unchanged.
- **Zero as a paired value** (\`[0, 5, 0]\`): 0 cancels like any other number; 5 is returned.
- **Zero as the single value** (\`[0, 4, 4]\`): returns 0, which is correct; but it is also what an empty array returns, so validate input if empty arrays are possible.
- **Input that breaks the promise** (some number three times): XOR silently returns a wrong value. Ask first; do not assume.
- **Very large values**: see the language notes on integer width below.

## Common Pitfalls

- **Values outside the int32 range.** \`^\` truncates to 32 bits, so XOR of large numbers (IDs, timestamps) is wrong without \`BigInt\`.
- **\`reduce\` without the initial value.** \`[].reduce((a, x) => a ^ x)\` throws \`TypeError\`.
- **Using a plain object for counts.** Keys become strings; use a \`Map\`.
- **Default \`sort()\` in the sort-based approach.** \`[10, 9, 1].sort()\` gives \`[1, 10, 9]\`; pass \`(a, b) => a - b\`.
- **Assuming XOR works when a value appears three times.** \`a ^ a ^ a === a\`; ask about the promise first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> of counts is O(n) time and O(n) space; nested loops are O(n²).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Key fact:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ a === 0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ 0 === a</code>, and XOR is commutative and associative.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">let result = 0; for (const x of nums) result ^= x;</code> and the pairs cancel.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) extra space; O(n) is optimal because every element must be read.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JS note:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">^</code> works on 32-bit signed ints. Fine for int32 inputs; for larger values use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0n</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with numbers above 2^31?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Plain-number <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">^</code> converts both sides to int32 and drops the high bits, so the answer is wrong. Convert to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> and XOR with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0n</code> as the start value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if every other number appears three times?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count each bit position mod 3. In JavaScript <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result |= 1 &lt;&lt; bit</code> already returns a signed int32, so a negative answer comes out correctly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if two numbers appear once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">XOR all to get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ b</code>, take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">low = both &amp; -both</code>, XOR only the numbers with that bit set to get one value; the other is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">both ^ a</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a plain object for counting?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Object keys are strings, and prototype keys can collide. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> keeps numeric keys, has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">size</code>, and iterates in insertion order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the sum trick safe in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Up to 2^53 the double sums are exact, so for normal inputs yes; but it needs a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code>, which is O(n) extra space, so XOR is still better.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **XOR (exclusive or)** | Bitwise operation: 1 where the two bits differ, 0 where they match |
| **Commutative and associative** | Order and grouping of the operands do not change the result |
| **Extra space (auxiliary space)** | Memory used beyond the input itself |
| **Bitwise operation** | An operation applied to each bit position independently |
| **Bit counting mod k** | Sum each bit position over all numbers and take it mod k |
| **Lowest set bit** | \`x & -x\`: only the lowest 1 bit of x |

---
**Conclusion:** XOR cancels every pair and leaves the single value, so one pass with \`result ^= x\` solves the problem in O(n) time and O(1) extra space, beating the \`Map\` count on memory and the nested scan on time. In JavaScript, remember that bitwise operators work on 32-bit signed integers: correct for typical inputs, wrong for very large values unless you switch to \`BigInt\`.`,
        examples: [
          {
            label: `singleNumber with XOR, plus a trace of the running value`,
            code: `function singleNumber(nums) {
  // XOR everything: pairs cancel (a ^ a = 0), and 0 ^ x = x.
  let result = 0;
  for (const x of nums) result ^= x;
  return result;
}

function singleNumberReduce(nums) {
  return nums.reduce((acc, x) => acc ^ x, 0); // the initial 0 matters for []
}

console.log(singleNumber([2, 2, 1])); // 1
console.log(singleNumber([4, 1, 2, 1, 2])); // 4
console.log(singleNumber([1])); // 1
console.log(singleNumber([-3, 7, 7])); // -3
console.log(singleNumber([0, 5, 0])); // 5
console.log(singleNumberReduce([9, 3, 9, 8, 3])); // 8

// Trace the running XOR on [4, 1, 2, 1, 2].
let acc = 0;
for (const x of [4, 1, 2, 1, 2]) {
  acc ^= x;
  console.log('^ ' + x + ' -> ' + acc.toString(2).padStart(3, '0') + ' (' + acc + ')');
}`,
          },
          {
            label: `Brute force vs Map vs sort vs sum vs XOR, with work counters`,
            code: `// Five ways to find the single number, with a work counter for each.

function build(pairs, single, seed) {
  const nums = [];
  for (let i = 1; i <= pairs; i++) {
    const v = (i * 7919) % 10007; // 1000 distinct values
    nums.push(v, v);
  }
  nums.push(single);
  for (let i = nums.length - 1; i > 0; i--) { // Fisher-Yates with a fixed LCG
    seed = (seed * 48271) % 2147483647; // < 2^53, so exact in a double
    const j = seed % (i + 1);
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  return nums;
}

const nums = build(1000, 10012, 7);
const n = nums.length;
console.log('n = ' + n);

// 1. Brute force: count each value by scanning the whole array. O(n^2) time.
let comparisons = 0, brute = null;
for (const x of nums) {
  let count = 0;
  for (const y of nums) {
    comparisons++;
    if (x === y) count++;
  }
  if (count === 1) { brute = x; break; }
}
console.log('brute force: ' + brute + '  comparisons ' + comparisons);

// 2. Map of counts. O(n) time, O(n) extra space.
const counts = new Map();
for (const x of nums) counts.set(x, (counts.get(x) || 0) + 1);
let hashed = null;
for (const [x, c] of counts) if (c === 1) hashed = x;
console.log('hash map:    ' + hashed + '  entries ' + counts.size);

// 3. Sort numerically (the default sort compares strings!), then compare neighbours.
const s = [...nums].sort((a, b) => a - b);
let i = 0;
while (i + 1 < s.length && s[i] === s[i + 1]) i += 2;
console.log('sort:        ' + s[i] + '  pairs checked ' + i / 2);

// 4. Math: 2 * sum(distinct) - sum(all).
let sumAll = 0, sumSet = 0;
for (const x of nums) sumAll += x;
for (const x of new Set(nums)) sumSet += x;
console.log('sum trick:   ' + (2 * sumSet - sumAll) + '  sum(all) ' + sumAll);

// 5. XOR. O(n) time, O(1) extra space.
let acc = 0;
for (const x of nums) acc ^= x;
console.log('xor:         ' + acc + '  xor operations ' + n);`,
          },
          {
            label: `Follow-ups: every other value three times, and two single values`,
            code: `// Follow-ups: every other number appears THREE times, or TWO numbers are single.

function singleOfThree(nums) {
  // Count each of the 32 bit positions mod 3; the leftover bits are the answer.
  let result = 0;
  for (let bit = 0; bit < 32; bit++) {
    let total = 0;
    for (const x of nums) total += (x >> bit) & 1;
    if (total % 3) result |= 1 << bit; // |= gives an int32, so bit 31 makes it negative
  }
  return result;
}

function singleOfThreeStates(nums) {
  // Same idea with two bitmasks: ones/twos hold the count mod 3 of every bit.
  let ones = 0, twos = 0;
  for (const x of nums) {
    ones = (ones ^ x) & ~twos;
    twos = (twos ^ x) & ~ones;
  }
  return ones;
}

function twoSingles(nums) {
  // XOR all = a ^ b. Its lowest 1 bit is a bit where a and b differ: split on it.
  let both = 0;
  for (const x of nums) both ^= x;
  const low = both & -both;
  let a = 0;
  for (const x of nums) if (x & low) a ^= x;
  const b = both ^ a;
  return '[' + Math.min(a, b) + ', ' + Math.max(a, b) + ']';
}

console.log(singleOfThree([2, 2, 3, 2])); // 3
console.log(singleOfThree([0, 1, 0, 1, 0, 1, 99])); // 99
console.log(singleOfThree([-2, -2, 1, 1, -3, 1, -3, -3, -4, -2])); // -4
console.log(singleOfThreeStates([-2, -2, 1, 1, -3, 1, -3, -3, -4, -2])); // -4
console.log(twoSingles([1, 2, 1, 3, 2, 5])); // [3, 5]
console.log(twoSingles([-1, 0])); // [-1, 0]
console.log(twoSingles([4, 7, 4, 9, 9, 12])); // [7, 12]`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"You get a non-empty \`int[]\` in which every value appears exactly twice except one, which appears once. Write a Java method that returns that single value, in linear time and constant extra space."

**What a strong answer should cover:**
- The baselines: nested loops O(n²), a \`HashMap<Integer, Integer>\` of counts O(n) time and O(n) space, \`Arrays.sort\` O(n log n).
- XOR: \`a ^ a == 0\` and \`a ^ 0 == a\`, commutative and associative, so XOR-ing everything leaves the single number.
- O(n) time, O(1) extra space, and why O(n) is a lower bound.
- Java details: \`^\` on \`int\` is a plain 32-bit operation with no overflow concerns; the \`HashMap\` version boxes every value into an \`Integer\`; comparing two \`Integer\` objects with \`==\` is a classic bug.
- The follow-ups: three-times (count bits mod 3) and two singles (split on \`both & -both\`, which is \`Integer.lowestOneBit\`).

**Clarifying questions expected:**
- Is it guaranteed that every other value appears exactly twice?
- Is O(n) extra memory allowed?

**Code / implementation expected:** Yes — a one-pass XOR method in Java, optionally the \`HashMap\` version for comparison.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know arrays and loops in Java; binary and XOR are explained from scratch.  
**Difficulty:** Easy  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You empty a laundry basket onto the bed. Every sock has a twin, except one. The slow way is to pick up a sock and search the whole pile for its partner, again and again. A faster way is to keep a list of "socks I have seen once": add a sock when it first shows up, cross it off when its twin appears, and the one name left on the list is the odd sock. That works, but the list can get long.

Now imagine a single light switch instead of a list. Every time you see a sock, you flip a switch labelled with that sock's colour. A colour seen twice is flipped twice, so it ends up back where it started. Only the odd sock's switch stays flipped. Numbers already come with a row of tiny switches — their binary bits — and the operation that flips them is **XOR**. That is the whole trick: XOR every number together and the pairs switch themselves off.

Interviewers like this question because the obvious answers (search, or a hash map) are easy, and the best answer needs one fact about bits that many candidates have never thought about. It is also the doorway to a family of follow-ups: every other number appears three times, two numbers are single, or one number is missing from 0..n.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is it guaranteed that exactly one number appears once and every other appears exactly twice? | XOR only works under that promise. If some number could appear three times, XOR returns garbage. |
| Can I use extra memory? | A hash map is O(n) extra space. The follow-up usually demands O(1) extra space, which is what forces XOR. |
| Can the array be modified? | Sorting in place uses no extra array but changes the input and costs O(n log n). |
| Can the numbers be negative, or larger than 32 bits? | XOR handles negatives, but in some languages bitwise operators truncate to 32 bits. |
| Is the array ever empty? | With no single number the question has no answer; XOR would return 0, which might be mistaken for a real answer. |

## 3. The One Fact You Need: XOR

**XOR** ("exclusive or") compares two bits and outputs 1 when they are *different*, 0 when they are the *same*. On whole numbers it does that for every bit position at once: \`6 ^ 3\` is \`110 ^ 011 = 101\`, which is 5.

📌 **Interview term: XOR (exclusive or)** — a bitwise operation whose result bit is 1 exactly when the two input bits differ. Written \`^\` in Python, JavaScript, Java and C++.

Four properties make XOR perfect for this problem:

| Property | In symbols | Why it helps |
| :--- | :--- | :--- |
| A number cancels itself | \`a ^ a = 0\` | every pair disappears |
| Zero changes nothing | \`a ^ 0 = a\` | start the running result at 0, and what survives is the single number |
| Order does not matter | \`a ^ b = b ^ a\` | the twins do not need to be next to each other |
| Grouping does not matter | \`(a ^ b) ^ c = a ^ (b ^ c)\` | we can XOR left to right in one pass |

📌 **Interview term: Commutative and associative** — an operation is commutative if swapping the inputs gives the same result, and associative if regrouping them does. Together they mean the order of a long XOR chain does not matter.

Because order and grouping do not matter, XOR-ing the whole array is the same as first lining up every pair next to its twin:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="The array 4 1 2 1 2 regrouped: 1 xor 1 is 0, 2 xor 2 is 0, and 4 is left, so the answer is 4">
  <defs>
    <marker id="b33q3-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="140" height="50" rx="8"/>
  <text class="d-text" x="110" y="61" text-anchor="middle">1 ^ 1</text>
  <rect class="d-box" x="250" y="30" width="140" height="50" rx="8"/>
  <text class="d-text" x="320" y="61" text-anchor="middle">2 ^ 2</text>
  <rect class="d-box" x="460" y="30" width="140" height="50" rx="8"/>
  <text class="d-text" x="530" y="61" text-anchor="middle">4</text>
  <path class="d-edge" d="M 110 82 L 110 124" marker-end="url(#b33q3-a1)"/>
  <path class="d-edge" d="M 320 82 L 320 124" marker-end="url(#b33q3-a1)"/>
  <path class="d-edge" d="M 530 82 L 530 124" marker-end="url(#b33q3-a1)"/>
  <rect class="d-box-muted" x="40" y="130" width="140" height="50" rx="8"/>
  <text class="d-text" x="110" y="161" text-anchor="middle">0</text>
  <text class="d-text" x="215" y="161" text-anchor="middle">^</text>
  <rect class="d-box-muted" x="250" y="130" width="140" height="50" rx="8"/>
  <text class="d-text" x="320" y="161" text-anchor="middle">0</text>
  <text class="d-text" x="425" y="161" text-anchor="middle">^</text>
  <rect class="d-box-accent" x="460" y="130" width="140" height="50" rx="8"/>
  <text class="d-text" x="530" y="161" text-anchor="middle">4 = answer</text>
</svg>

The pairs turn into zeros and the zeros change nothing, so the single number is all that is left. The computer never actually regroups anything; it just walks the array once, and the running result passes through intermediate values that look random until the last step:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Running XOR over 4 1 2 1 2: the accumulator goes 100, 101, 111, 110, 100, ending at 4">
  <defs>
    <marker id="b33q3-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="25" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="80" y="56" text-anchor="middle">x = 4</text>
  <text class="d-sub" x="80" y="80" text-anchor="middle">100</text>
  <rect class="d-box" x="175" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="230" y="56" text-anchor="middle">x = 1</text>
  <text class="d-sub" x="230" y="80" text-anchor="middle">001</text>
  <rect class="d-box" x="325" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="380" y="56" text-anchor="middle">x = 2</text>
  <text class="d-sub" x="380" y="80" text-anchor="middle">010</text>
  <rect class="d-box" x="475" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="530" y="56" text-anchor="middle">x = 1</text>
  <text class="d-sub" x="530" y="80" text-anchor="middle">001</text>
  <rect class="d-box" x="625" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="680" y="56" text-anchor="middle">x = 2</text>
  <text class="d-sub" x="680" y="80" text-anchor="middle">010</text>
  <path class="d-edge" d="M 80 96 L 80 130" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge" d="M 230 96 L 230 130" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge" d="M 380 96 L 380 130" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge" d="M 530 96 L 530 130" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge" d="M 680 96 L 680 130" marker-end="url(#b33q3-a2)"/>
  <rect class="d-box-muted" x="25" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="80" y="162" text-anchor="middle">acc 4</text>
  <text class="d-sub" x="80" y="186" text-anchor="middle">100</text>
  <rect class="d-box-muted" x="175" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="230" y="162" text-anchor="middle">acc 5</text>
  <text class="d-sub" x="230" y="186" text-anchor="middle">101</text>
  <rect class="d-box-muted" x="325" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="380" y="162" text-anchor="middle">acc 7</text>
  <text class="d-sub" x="380" y="186" text-anchor="middle">111</text>
  <rect class="d-box-muted" x="475" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="530" y="162" text-anchor="middle">acc 6</text>
  <text class="d-sub" x="530" y="186" text-anchor="middle">110</text>
  <rect class="d-box-accent" x="625" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="680" y="162" text-anchor="middle">acc 4</text>
  <text class="d-sub" x="680" y="186" text-anchor="middle">100</text>
  <path class="d-edge-dashed" d="M 137 168 L 171 168" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge-dashed" d="M 287 168 L 321 168" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge-dashed" d="M 437 168 L 471 168" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge-dashed" d="M 587 168 L 621 168" marker-end="url(#b33q3-a2)"/>
</svg>

The accumulator starts at 0 and each number is XOR-ed into it. Look at each bit column on its own: the column flips once for every number that has a 1 there. Columns flipped an even number of times end at 0; only the single number's 1 bits are flipped an odd number of times. Example 1 prints exactly this trace.

## 4. From Brute Force to XOR

There are five reasonable answers, and walking through them in order is a good way to show the interviewer you understand the trade-offs.

1. **Brute force.** For each number, scan the whole array and count how often it appears; return the one with count 1. O(n²) time, O(1) extra space. On a 2,001-number array, example 2 makes **2,593,296** comparisons.
2. **Hash map of counts.** One pass to count, one pass over the counts. O(n) time, but O(n) extra space: 1,001 entries for the same array. See [how a hash table works](/interview-question/how-does-a-hash-table-work).
3. **Sort, then check neighbours.** After sorting, twins sit side by side, so step through two at a time until a pair does not match. O(n log n) time; O(1) extra space if you may sort the input in place.
4. **Sum trick.** \`2 * sum(distinct values) - sum(all values)\` counts every paired value twice in both terms and the single value once more on the left. O(n) time, but building the set of distinct values is O(n) space, and the sums can overflow fixed-size integers.
5. **XOR everything.** One pass, one variable: O(n) time, O(1) extra space, no overflow possible because XOR never produces a bit that was not already in range.

📌 **Interview term: Extra space (auxiliary space)** — memory an algorithm uses on top of its input. The XOR solution uses one integer, O(1); the hash map uses O(n). See [space complexity](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

📌 **Interview term: Bitwise operation** — an operation that works on each bit position of an integer independently, such as AND \`&\`, OR \`|\`, XOR \`^\` and NOT \`~\`.

## 5. The Code in Java

~~~java
static int singleNumber(int[] nums) {
    // XOR everything: pairs cancel (a ^ a = 0), and 0 ^ x = x.
    int result = 0;
    for (int x : nums) result ^= x;
    return result;
}
~~~

**What to point out in this code:**

- \`result ^= x\` is the whole algorithm, and starting at \`0\` is the "zero changes nothing" property.
- Java \`int\` is exactly 32-bit two's complement on every platform, so XOR of negatives is well defined and there is nothing to overflow: XOR never creates a bit outside the 32.
- The stream one-liner is \`Arrays.stream(nums).reduce(0, (a, b) -> a ^ b)\`. It is fine to mention, but the loop is clearer and avoids stream overhead.
- The O(n)-space version needs a \`HashMap<Integer, Integer>\`, which **boxes** every \`int\` into an \`Integer\` object. That is more memory per entry than the value itself, which is one more reason to prefer XOR.

~~~java
static int singleNumberMap(int[] nums) {
    Map<Integer, Integer> counts = new HashMap<>();
    for (int x : nums) counts.merge(x, 1, Integer::sum); // O(n) time, O(n) space
    for (Map.Entry<Integer, Integer> e : counts.entrySet())
        if (e.getValue() == 1) return e.getKey();          // Integer == int literal unboxes: safe
    throw new IllegalArgumentException("no single number");
}
~~~

📌 **Interview term: Boxing** — wrapping a primitive \`int\` in an \`Integer\` object so it can live in a collection such as \`HashMap\`. It costs memory and makes \`==\` compare object identity instead of value.

## 6. Verified: Running the Code

Each example was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — XOR on six inputs, then the running XOR traced bit by bit** prints:

~~~text
1
4
1
-3
5
8
^ 4 -> 100 (4)
^ 1 -> 101 (5)
^ 2 -> 111 (7)
^ 1 -> 110 (6)
^ 2 -> 100 (4)
~~~

The trace matches the second diagram: the accumulator passes through 5, 7 and 6 before landing on 4.

**Example 2 — five approaches on the same shuffled 2,001-number array, with a work counter for each** prints:

~~~text
n = 2001
brute force: 10012  comparisons 2593296
hash map:    10012  entries 1001
sort:        10012  pairs checked 1000
sum trick:   10012  sum(all) 10031060
xor:         10012  xor operations 2001
~~~

All five agree on 10012. The sums are kept in \`long\`: an \`int\` sum would overflow on bigger inputs, which is the main weakness of the sum trick in Java.

**Example 3 — the follow-ups: three times (two ways) and two singles** prints:

~~~text
3
99
-4
-4
[3, 5]
[-1, 0]
[7, 12]
~~~

The answer -4 comes out negative on its own, because bit 31 of a Java \`int\` is the sign bit.

## Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | a full scan for every element |
| Hash map of counts | O(n) | O(n) | one entry per distinct value |
| Sort + neighbours | O(n log n) | O(1) to O(n) | the sort dominates; in-place sort needs no array copy |
| Sum trick | O(n) | O(n) | the set of distinct values |
| **XOR** | **O(n)** | **O(1)** | one pass, one integer |
| Three-times follow-up (bit counting) | O(32·n) = O(n) | O(1) | 32 passes over the bits, or one pass with the ones/twos masks |
| Two-singles follow-up | O(n) | O(1) | two passes |

O(n) is also the lower bound: any algorithm must look at every element at least once, because the one it skips could be the single number. See [Big-O notation](/interview-question/what-is-big-o-notation) for what these labels mean.

## The Classic Follow-Ups

**"Every other number appears three times."** XOR fails, because \`a ^ a ^ a = a\`. Go back to the bit-column view: for each of the 32 bit positions, add up that bit over all numbers. Numbers that appear three times contribute 0 or 3 to every column, so \`column total % 3\` is exactly the single number's bit. Example 3 does this and also shows the compact two-mask version (\`ones\` and \`twos\` hold each bit's count mod 3).

📌 **Interview term: Bit counting mod k** — summing each bit position over all numbers and taking the total mod k; it finds the one number that appears a different number of times than all the others.

**"Exactly two numbers appear once."** XOR everything to get \`a ^ b\`. It is not zero (a and b differ), so it has at least one 1 bit, and at that bit a and b disagree. Take the lowest one, \`low = both & -both\`, and XOR again, but only the numbers that have that bit set: pairs still cancel, and only one of a, b is in that group. The other is \`both ^ a\`.

📌 **Interview term: Lowest set bit** — \`x & -x\` keeps only the lowest 1 bit of x (for 44 = 101100 it is 4 = 000100), because in two's complement \`-x\` is \`~x + 1\`. More tricks like it are on [the bit manipulation tricks page](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews).

**"One number from 0..n is missing."** XOR all the indices 0..n with all the values; every present number cancels with its index and the missing one survives. That is [the missing number question](/interview-question/how-do-you-find-the-missing-number-in-0-n). Related: [finding a duplicate](/interview-question/how-do-you-find-a-duplicate-in-an-array) and the [majority element](/interview-question/how-do-you-find-the-majority-element), which look similar but need different tricks.

**The three-times follow-up in Java.** Bit counting builds the answer with \`result |= 1 << bit\`. On a Java \`int\`, \`1 << 31\` is the sign bit, so a negative answer simply comes out negative: example 3 returns -4 with no conversion.

~~~java
static int singleOfThree(int[] nums) {
    // Count each of the 32 bit positions mod 3; the leftover bits are the answer.
    int result = 0;
    for (int bit = 0; bit < 32; bit++) {
        int total = 0;
        for (int x : nums) total += (x >> bit) & 1;
        if (total % 3 != 0) result |= 1 << bit; // bit 31 makes the int negative, as it should
    }
    return result;
}
~~~

\`x >> bit\` is an arithmetic shift and \`x >>> bit\` a logical one; after \`& 1\` both give the right bit for positions 0 to 31.

## Edge Cases

- **One element** (\`[1]\`): the loop runs once and returns it.
- **Negative numbers** (\`[-3, 7, 7]\`): XOR works on the two's complement bit pattern, so -3 comes out unchanged.
- **Zero as a paired value** (\`[0, 5, 0]\`): 0 cancels like any other number; 5 is returned.
- **Zero as the single value** (\`[0, 4, 4]\`): returns 0, which is correct; but it is also what an empty array returns, so validate input if empty arrays are possible.
- **Input that breaks the promise** (some number three times): XOR silently returns a wrong value. Ask first; do not assume.
- **Very large values**: see the language notes on integer width below.

## Common Pitfalls

- **Comparing boxed \`Integer\`s with \`==\`.** \`Integer a = 128, b = 128; a == b\` is \`false\` in our run (127 gives \`true\`, because small values are cached). Use \`equals\`, or unbox to \`int\`.
- **Summing in \`int\` for the sum trick.** \`2 * sum - total\` overflows silently for large inputs; use \`long\`, or just use XOR.
- **\`counts.get(x) + 1\` on a missing key.** \`get\` returns \`null\` and unboxing it throws \`NullPointerException\`; use \`merge\` or \`getOrDefault\`.
- **Sorting the caller's array.** \`Arrays.sort(nums)\` mutates the input; clone it first if the caller still needs it.
- **Assuming XOR works when a value appears three times.** \`a ^ a ^ a == a\`; ask about the promise first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Integer, Integer&gt;</code> of counts is O(n) time and O(n) space with boxing; nested loops are O(n²).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Key fact:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ a == 0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ 0 == a</code>, and XOR is commutative and associative.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int result = 0; for (int x : nums) result ^= x;</code> and the pairs cancel.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) extra space; O(n) is optimal because every element must be read.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java note:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> is fixed 32-bit two's complement, so negatives just work and XOR cannot overflow.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if every other number appears three times?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count each of the 32 bit positions mod 3 and set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result |= 1 &lt;&lt; bit</code>. Bit 31 is the sign bit of an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, so negative answers come out right.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if two numbers appear once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">XOR all to get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">both</code>, take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">both &amp; -both</code> (same as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.lowestOneBit(both)</code>), XOR the numbers with that bit set to get one value; the other is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">both ^ a</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the HashMap version heavier than it looks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every key and count is a boxed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer</code>, plus a map entry object, so memory per element is many times the 4 bytes of an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the sum trick overflow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> it wraps silently. In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> it is safe for any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code> of realistic size, but it still needs a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet</code>, which is O(n) space.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would a stream be acceptable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.stream(nums).reduce(0, (a, b) -&gt; a ^ b)</code> is correct and O(n). In an interview the loop is clearer; mention the stream as an alternative.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **XOR (exclusive or)** | Bitwise operation: 1 where the two bits differ, 0 where they match |
| **Commutative and associative** | Order and grouping of the operands do not change the result |
| **Extra space (auxiliary space)** | Memory used beyond the input itself |
| **Bitwise operation** | An operation applied to each bit position independently |
| **Bit counting mod k** | Sum each bit position over all numbers and take it mod k |
| **Lowest set bit** | \`x & -x\`: only the lowest 1 bit of x |
| **Boxing** | Wrapping an \`int\` in an \`Integer\` object for collections |

---
**Conclusion:** XOR cancels every pair and leaves the single value, so one pass of \`result ^= x\` over the \`int[]\` solves the problem in O(n) time and O(1) extra space, without the boxing cost of a \`HashMap<Integer, Integer>\` or the O(n²) time of nested loops. Java's fixed 32-bit \`int\` makes negatives and the three-times follow-up work without any conversion; just keep sums in \`long\` and never compare boxed \`Integer\`s with \`==\`.`,
        examples: [
          {
            label: `singleNumber with XOR, plus a trace of the running value`,
            code: `import java.util.Arrays;

public class Main {
    static int singleNumber(int[] nums) {
        // XOR everything: pairs cancel (a ^ a = 0), and 0 ^ x = x.
        int result = 0;
        for (int x : nums) result ^= x;
        return result;
    }

    static int singleNumberStream(int[] nums) {
        return Arrays.stream(nums).reduce(0, (a, b) -> a ^ b); // same thing with streams
    }

    public static void main(String[] args) {
        System.out.println(singleNumber(new int[] {2, 2, 1})); // 1
        System.out.println(singleNumber(new int[] {4, 1, 2, 1, 2})); // 4
        System.out.println(singleNumber(new int[] {1})); // 1
        System.out.println(singleNumber(new int[] {-3, 7, 7})); // -3
        System.out.println(singleNumber(new int[] {0, 5, 0})); // 5
        System.out.println(singleNumberStream(new int[] {9, 3, 9, 8, 3})); // 8

        // Trace the running XOR on [4, 1, 2, 1, 2].
        int acc = 0;
        for (int x : new int[] {4, 1, 2, 1, 2}) {
            acc ^= x;
            String bin = String.format("%3s", Integer.toBinaryString(acc)).replace(' ', '0');
            System.out.println("^ " + x + " -> " + bin + " (" + acc + ")");
        }
    }
}`,
          },
          {
            label: `Brute force vs HashMap vs sort vs sum vs XOR, with work counters`,
            code: `import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

// Five ways to find the single number, with a work counter for each.
public class Main {
    static int[] build(int pairs, int single, long seed) {
        int[] nums = new int[2 * pairs + 1];
        int k = 0;
        for (int i = 1; i <= pairs; i++) {
            int v = i * 7919 % 10007; // 1000 distinct values
            nums[k++] = v;
            nums[k++] = v;
        }
        nums[k] = single;
        for (int i = nums.length - 1; i > 0; i--) { // Fisher-Yates with a fixed LCG
            seed = seed * 48271 % 2147483647L; // long: the product overflows int
            int j = (int) (seed % (i + 1));
            int t = nums[i]; nums[i] = nums[j]; nums[j] = t;
        }
        return nums;
    }

    public static void main(String[] args) {
        int[] nums = build(1000, 10012, 7);
        int n = nums.length;
        System.out.println("n = " + n);

        long comparisons = 0;
        Integer brute = null;
        for (int x : nums) {
            int count = 0;
            for (int y : nums) {
                comparisons++;
                if (x == y) count++;
            }
            if (count == 1) { brute = x; break; }
        }
        System.out.println("brute force: " + brute + "  comparisons " + comparisons);

        Map<Integer, Integer> counts = new HashMap<>();
        for (int x : nums) counts.merge(x, 1, Integer::sum);
        int hashed = -1;
        for (Map.Entry<Integer, Integer> e : counts.entrySet())
            if (e.getValue() == 1) hashed = e.getKey(); // getValue() is an Integer; == 1 unboxes it
        System.out.println("hash map:    " + hashed + "  entries " + counts.size());

        int[] s = nums.clone();
        Arrays.sort(s);
        int i = 0;
        while (i + 1 < s.length && s[i] == s[i + 1]) i += 2;
        System.out.println("sort:        " + s[i] + "  pairs checked " + i / 2);

        long sumAll = 0, sumSet = 0; // long: an int sum can overflow on big inputs
        HashSet<Integer> set = new HashSet<>();
        for (int x : nums) { sumAll += x; set.add(x); }
        for (int x : set) sumSet += x;
        System.out.println("sum trick:   " + (2 * sumSet - sumAll) + "  sum(all) " + sumAll);

        int acc = 0;
        for (int x : nums) acc ^= x;
        System.out.println("xor:         " + acc + "  xor operations " + n);
    }
}`,
          },
          {
            label: `Follow-ups: every other value three times, and two single values`,
            code: `// Follow-ups: every other number appears THREE times, or TWO numbers are single.
public class Main {
    static int singleOfThree(int[] nums) {
        // Count each of the 32 bit positions mod 3; the leftover bits are the answer.
        int result = 0;
        for (int bit = 0; bit < 32; bit++) {
            int total = 0;
            for (int x : nums) total += (x >> bit) & 1;
            if (total % 3 != 0) result |= 1 << bit; // bit 31 makes the int negative, as it should
        }
        return result;
    }

    static int singleOfThreeStates(int[] nums) {
        // Same idea with two bitmasks: ones/twos hold the count mod 3 of every bit.
        int ones = 0, twos = 0;
        for (int x : nums) {
            ones = (ones ^ x) & ~twos;
            twos = (twos ^ x) & ~ones;
        }
        return ones;
    }

    static String twoSingles(int[] nums) {
        // XOR all = a ^ b. Its lowest 1 bit is a bit where a and b differ: split on it.
        int both = 0;
        for (int x : nums) both ^= x;
        int low = both & -both; // same as Integer.lowestOneBit(both)
        int a = 0;
        for (int x : nums) if ((x & low) != 0) a ^= x;
        int b = both ^ a;
        return "[" + Math.min(a, b) + ", " + Math.max(a, b) + "]";
    }

    public static void main(String[] args) {
        System.out.println(singleOfThree(new int[] {2, 2, 3, 2})); // 3
        System.out.println(singleOfThree(new int[] {0, 1, 0, 1, 0, 1, 99})); // 99
        System.out.println(singleOfThree(new int[] {-2, -2, 1, 1, -3, 1, -3, -3, -4, -2})); // -4
        System.out.println(singleOfThreeStates(new int[] {-2, -2, 1, 1, -3, 1, -3, -3, -4, -2})); // -4
        System.out.println(twoSingles(new int[] {1, 2, 1, 3, 2, 5})); // [3, 5]
        System.out.println(twoSingles(new int[] {-1, 0})); // [-1, 0]
        System.out.println(twoSingles(new int[] {4, 7, 4, 9, 9, 12})); // [7, 12]
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"You get a non-empty \`std::vector<int>\` in which every value appears exactly twice except one, which appears once. Write a C++ function that returns that single value, in linear time and constant extra space."

**What a strong answer should cover:**
- The baselines: nested loops O(n²), an \`std::unordered_map<int, int>\` of counts O(n) time and O(n) space, \`std::sort\` O(n log n).
- XOR: \`a ^ a == 0\` and \`a ^ 0 == a\`, commutative and associative, so XOR-ing everything leaves the single number.
- O(n) time, O(1) extra space, and why O(n) is a lower bound.
- C++ details: XOR on \`int\` never overflows, but signed overflow in the sum trick is undefined behaviour; \`std::accumulate\` with \`std::bit_xor<int>()\` is the library one-liner; take the vector by \`const&\`.
- The follow-ups: three-times (count bits mod 3, building the answer in \`uint32_t\`) and two singles (split on the lowest set bit).

**Clarifying questions expected:**
- Is it guaranteed that every other value appears exactly twice?
- Is O(n) extra memory allowed?

**Code / implementation expected:** Yes — a one-pass XOR function in C++17, optionally the \`unordered_map\` version for comparison.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know arrays and loops in C++; binary and XOR are explained from scratch.  
**Difficulty:** Easy  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You empty a laundry basket onto the bed. Every sock has a twin, except one. The slow way is to pick up a sock and search the whole pile for its partner, again and again. A faster way is to keep a list of "socks I have seen once": add a sock when it first shows up, cross it off when its twin appears, and the one name left on the list is the odd sock. That works, but the list can get long.

Now imagine a single light switch instead of a list. Every time you see a sock, you flip a switch labelled with that sock's colour. A colour seen twice is flipped twice, so it ends up back where it started. Only the odd sock's switch stays flipped. Numbers already come with a row of tiny switches — their binary bits — and the operation that flips them is **XOR**. That is the whole trick: XOR every number together and the pairs switch themselves off.

Interviewers like this question because the obvious answers (search, or a hash map) are easy, and the best answer needs one fact about bits that many candidates have never thought about. It is also the doorway to a family of follow-ups: every other number appears three times, two numbers are single, or one number is missing from 0..n.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is it guaranteed that exactly one number appears once and every other appears exactly twice? | XOR only works under that promise. If some number could appear three times, XOR returns garbage. |
| Can I use extra memory? | A hash map is O(n) extra space. The follow-up usually demands O(1) extra space, which is what forces XOR. |
| Can the array be modified? | Sorting in place uses no extra array but changes the input and costs O(n log n). |
| Can the numbers be negative, or larger than 32 bits? | XOR handles negatives, but in some languages bitwise operators truncate to 32 bits. |
| Is the array ever empty? | With no single number the question has no answer; XOR would return 0, which might be mistaken for a real answer. |

## 3. The One Fact You Need: XOR

**XOR** ("exclusive or") compares two bits and outputs 1 when they are *different*, 0 when they are the *same*. On whole numbers it does that for every bit position at once: \`6 ^ 3\` is \`110 ^ 011 = 101\`, which is 5.

📌 **Interview term: XOR (exclusive or)** — a bitwise operation whose result bit is 1 exactly when the two input bits differ. Written \`^\` in Python, JavaScript, Java and C++.

Four properties make XOR perfect for this problem:

| Property | In symbols | Why it helps |
| :--- | :--- | :--- |
| A number cancels itself | \`a ^ a = 0\` | every pair disappears |
| Zero changes nothing | \`a ^ 0 = a\` | start the running result at 0, and what survives is the single number |
| Order does not matter | \`a ^ b = b ^ a\` | the twins do not need to be next to each other |
| Grouping does not matter | \`(a ^ b) ^ c = a ^ (b ^ c)\` | we can XOR left to right in one pass |

📌 **Interview term: Commutative and associative** — an operation is commutative if swapping the inputs gives the same result, and associative if regrouping them does. Together they mean the order of a long XOR chain does not matter.

Because order and grouping do not matter, XOR-ing the whole array is the same as first lining up every pair next to its twin:

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="The array 4 1 2 1 2 regrouped: 1 xor 1 is 0, 2 xor 2 is 0, and 4 is left, so the answer is 4">
  <defs>
    <marker id="b33q3-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="140" height="50" rx="8"/>
  <text class="d-text" x="110" y="61" text-anchor="middle">1 ^ 1</text>
  <rect class="d-box" x="250" y="30" width="140" height="50" rx="8"/>
  <text class="d-text" x="320" y="61" text-anchor="middle">2 ^ 2</text>
  <rect class="d-box" x="460" y="30" width="140" height="50" rx="8"/>
  <text class="d-text" x="530" y="61" text-anchor="middle">4</text>
  <path class="d-edge" d="M 110 82 L 110 124" marker-end="url(#b33q3-a1)"/>
  <path class="d-edge" d="M 320 82 L 320 124" marker-end="url(#b33q3-a1)"/>
  <path class="d-edge" d="M 530 82 L 530 124" marker-end="url(#b33q3-a1)"/>
  <rect class="d-box-muted" x="40" y="130" width="140" height="50" rx="8"/>
  <text class="d-text" x="110" y="161" text-anchor="middle">0</text>
  <text class="d-text" x="215" y="161" text-anchor="middle">^</text>
  <rect class="d-box-muted" x="250" y="130" width="140" height="50" rx="8"/>
  <text class="d-text" x="320" y="161" text-anchor="middle">0</text>
  <text class="d-text" x="425" y="161" text-anchor="middle">^</text>
  <rect class="d-box-accent" x="460" y="130" width="140" height="50" rx="8"/>
  <text class="d-text" x="530" y="161" text-anchor="middle">4 = answer</text>
</svg>

The pairs turn into zeros and the zeros change nothing, so the single number is all that is left. The computer never actually regroups anything; it just walks the array once, and the running result passes through intermediate values that look random until the last step:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Running XOR over 4 1 2 1 2: the accumulator goes 100, 101, 111, 110, 100, ending at 4">
  <defs>
    <marker id="b33q3-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="25" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="80" y="56" text-anchor="middle">x = 4</text>
  <text class="d-sub" x="80" y="80" text-anchor="middle">100</text>
  <rect class="d-box" x="175" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="230" y="56" text-anchor="middle">x = 1</text>
  <text class="d-sub" x="230" y="80" text-anchor="middle">001</text>
  <rect class="d-box" x="325" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="380" y="56" text-anchor="middle">x = 2</text>
  <text class="d-sub" x="380" y="80" text-anchor="middle">010</text>
  <rect class="d-box" x="475" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="530" y="56" text-anchor="middle">x = 1</text>
  <text class="d-sub" x="530" y="80" text-anchor="middle">001</text>
  <rect class="d-box" x="625" y="30" width="110" height="64" rx="8"/>
  <text class="d-text" x="680" y="56" text-anchor="middle">x = 2</text>
  <text class="d-sub" x="680" y="80" text-anchor="middle">010</text>
  <path class="d-edge" d="M 80 96 L 80 130" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge" d="M 230 96 L 230 130" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge" d="M 380 96 L 380 130" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge" d="M 530 96 L 530 130" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge" d="M 680 96 L 680 130" marker-end="url(#b33q3-a2)"/>
  <rect class="d-box-muted" x="25" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="80" y="162" text-anchor="middle">acc 4</text>
  <text class="d-sub" x="80" y="186" text-anchor="middle">100</text>
  <rect class="d-box-muted" x="175" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="230" y="162" text-anchor="middle">acc 5</text>
  <text class="d-sub" x="230" y="186" text-anchor="middle">101</text>
  <rect class="d-box-muted" x="325" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="380" y="162" text-anchor="middle">acc 7</text>
  <text class="d-sub" x="380" y="186" text-anchor="middle">111</text>
  <rect class="d-box-muted" x="475" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="530" y="162" text-anchor="middle">acc 6</text>
  <text class="d-sub" x="530" y="186" text-anchor="middle">110</text>
  <rect class="d-box-accent" x="625" y="136" width="110" height="64" rx="8"/>
  <text class="d-text" x="680" y="162" text-anchor="middle">acc 4</text>
  <text class="d-sub" x="680" y="186" text-anchor="middle">100</text>
  <path class="d-edge-dashed" d="M 137 168 L 171 168" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge-dashed" d="M 287 168 L 321 168" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge-dashed" d="M 437 168 L 471 168" marker-end="url(#b33q3-a2)"/>
  <path class="d-edge-dashed" d="M 587 168 L 621 168" marker-end="url(#b33q3-a2)"/>
</svg>

The accumulator starts at 0 and each number is XOR-ed into it. Look at each bit column on its own: the column flips once for every number that has a 1 there. Columns flipped an even number of times end at 0; only the single number's 1 bits are flipped an odd number of times. Example 1 prints exactly this trace.

## 4. From Brute Force to XOR

There are five reasonable answers, and walking through them in order is a good way to show the interviewer you understand the trade-offs.

1. **Brute force.** For each number, scan the whole array and count how often it appears; return the one with count 1. O(n²) time, O(1) extra space. On a 2,001-number array, example 2 makes **2,593,296** comparisons.
2. **Hash map of counts.** One pass to count, one pass over the counts. O(n) time, but O(n) extra space: 1,001 entries for the same array. See [how a hash table works](/interview-question/how-does-a-hash-table-work).
3. **Sort, then check neighbours.** After sorting, twins sit side by side, so step through two at a time until a pair does not match. O(n log n) time; O(1) extra space if you may sort the input in place.
4. **Sum trick.** \`2 * sum(distinct values) - sum(all values)\` counts every paired value twice in both terms and the single value once more on the left. O(n) time, but building the set of distinct values is O(n) space, and the sums can overflow fixed-size integers.
5. **XOR everything.** One pass, one variable: O(n) time, O(1) extra space, no overflow possible because XOR never produces a bit that was not already in range.

📌 **Interview term: Extra space (auxiliary space)** — memory an algorithm uses on top of its input. The XOR solution uses one integer, O(1); the hash map uses O(n). See [space complexity](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use).

📌 **Interview term: Bitwise operation** — an operation that works on each bit position of an integer independently, such as AND \`&\`, OR \`|\`, XOR \`^\` and NOT \`~\`.

## 5. The Code in C++

~~~cpp
int singleNumber(const std::vector<int>& nums) {
    // XOR everything: pairs cancel (a ^ a = 0), and 0 ^ x = x.
    int result = 0;
    for (int x : nums) result ^= x;
    return result;
}
~~~

**What to point out in this code:**

- \`result ^= x\` is the whole algorithm, and starting at \`0\` is the "zero changes nothing" property.
- The parameter is \`const std::vector<int>&\`: passing by value would copy the whole vector, an O(n) cost before the loop even starts.
- XOR on \`int\` is always defined: it only rearranges bits that already exist, so it cannot overflow. The sum trick, by contrast, can overflow an \`int\`, and **signed overflow is undefined behaviour** in C++, so use \`long long\` there.
- The library one-liner is \`std::accumulate(nums.begin(), nums.end(), 0, std::bit_xor<int>())\` (\`<numeric>\` and \`<functional>\`). Note the initial value \`0\` also fixes the result type: pass \`0LL\` and the accumulation happens in \`long long\`.
- The O(n)-space version uses \`std::unordered_map<int, int>\`. \`counts[x]++\` works because \`operator[]\` inserts a value-initialised \`0\` for a missing key.

~~~cpp
int singleNumberMap(const std::vector<int>& nums) {
    std::unordered_map<int, int> counts;
    for (int x : nums) counts[x]++;  // O(n) time, O(n) space
    for (const auto& [x, c] : counts)
        if (c == 1) return x;
    return 0;  // unreachable when the input keeps its promise
}
~~~

## 6. Verified: Running the Code

Each example was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — XOR on six inputs, then the running XOR traced bit by bit** prints:

~~~text
1
4
1
-3
5
8
^ 4 -> 100 (4)
^ 1 -> 101 (5)
^ 2 -> 111 (7)
^ 1 -> 110 (6)
^ 2 -> 100 (4)
~~~

The trace matches the second diagram: the accumulator passes through 5, 7 and 6 before landing on 4.

**Example 2 — five approaches on the same shuffled 2,001-number vector, with a work counter for each** prints:

~~~text
n = 2001
brute force: 10012  comparisons 2593296
hash map:    10012  entries 1001
sort:        10012  pairs checked 1000
sum trick:   10012  sum(all) 10031060
xor:         10012  xor operations 2001
~~~

All five agree on 10012. The sums are \`long long\`, because an overflowing \`int\` sum would be undefined behaviour, not just a wrong answer.

**Example 3 — the follow-ups: three times (two ways) and two singles** prints:

~~~text
3
99
-4
-4
[3, 5]
[-1, 0]
[7, 12]
~~~

The answer -4 comes back from the \`uint32_t\` pattern through one \`static_cast<int32_t>\`.

## Complexity

| Approach | Time | Extra space | Why |
| :--- | :--- | :--- | :--- |
| Brute force | O(n²) | O(1) | a full scan for every element |
| Hash map of counts | O(n) | O(n) | one entry per distinct value |
| Sort + neighbours | O(n log n) | O(1) to O(n) | the sort dominates; in-place sort needs no array copy |
| Sum trick | O(n) | O(n) | the set of distinct values |
| **XOR** | **O(n)** | **O(1)** | one pass, one integer |
| Three-times follow-up (bit counting) | O(32·n) = O(n) | O(1) | 32 passes over the bits, or one pass with the ones/twos masks |
| Two-singles follow-up | O(n) | O(1) | two passes |

O(n) is also the lower bound: any algorithm must look at every element at least once, because the one it skips could be the single number. See [Big-O notation](/interview-question/what-is-big-o-notation) for what these labels mean.

## The Classic Follow-Ups

**"Every other number appears three times."** XOR fails, because \`a ^ a ^ a = a\`. Go back to the bit-column view: for each of the 32 bit positions, add up that bit over all numbers. Numbers that appear three times contribute 0 or 3 to every column, so \`column total % 3\` is exactly the single number's bit. Example 3 does this and also shows the compact two-mask version (\`ones\` and \`twos\` hold each bit's count mod 3).

📌 **Interview term: Bit counting mod k** — summing each bit position over all numbers and taking the total mod k; it finds the one number that appears a different number of times than all the others.

**"Exactly two numbers appear once."** XOR everything to get \`a ^ b\`. It is not zero (a and b differ), so it has at least one 1 bit, and at that bit a and b disagree. Take the lowest one, \`low = both & -both\`, and XOR again, but only the numbers that have that bit set: pairs still cancel, and only one of a, b is in that group. The other is \`both ^ a\`.

📌 **Interview term: Lowest set bit** — \`x & -x\` keeps only the lowest 1 bit of x (for 44 = 101100 it is 4 = 000100), because in two's complement \`-x\` is \`~x + 1\`. More tricks like it are on [the bit manipulation tricks page](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews).

**"One number from 0..n is missing."** XOR all the indices 0..n with all the values; every present number cancels with its index and the missing one survives. That is [the missing number question](/interview-question/how-do-you-find-the-missing-number-in-0-n). Related: [finding a duplicate](/interview-question/how-do-you-find-a-duplicate-in-an-array) and the [majority element](/interview-question/how-do-you-find-the-majority-element), which look similar but need different tricks.

**The three-times follow-up in C++.** Building the answer with \`result |= 1 << bit\` on a signed \`int\` would need \`1 << 31\`, which overflows a signed int (undefined before C++20). Build it in \`uint32_t\` and convert once at the end:

~~~cpp
int singleOfThree(const std::vector<int>& nums) {
    // Count each of the 32 bit positions mod 3; the leftover bits are the answer.
    uint32_t result = 0;  // build it unsigned: 1 << 31 on a signed int is not safe
    for (int bit = 0; bit < 32; bit++) {
        int total = 0;
        for (int x : nums) total += (static_cast<uint32_t>(x) >> bit) & 1u;
        if (total % 3) result |= 1u << bit;
    }
    return static_cast<int32_t>(result);
}
~~~

The conversion from \`uint32_t\` to \`int32_t\` of a value above \`INT32_MAX\` was implementation-defined before C++20 and is defined as modular (two's complement) from C++20; GCC has always done the two's complement conversion, which is what example 3 relies on. In the two-singles version, \`-both\` is written as \`~both + 1u\` on an unsigned value for the same reason.

## Edge Cases

- **One element** (\`[1]\`): the loop runs once and returns it.
- **Negative numbers** (\`[-3, 7, 7]\`): XOR works on the two's complement bit pattern, so -3 comes out unchanged.
- **Zero as a paired value** (\`[0, 5, 0]\`): 0 cancels like any other number; 5 is returned.
- **Zero as the single value** (\`[0, 4, 4]\`): returns 0, which is correct; but it is also what an empty array returns, so validate input if empty arrays are possible.
- **Input that breaks the promise** (some number three times): XOR silently returns a wrong value. Ask first; do not assume.
- **Very large values**: see the language notes on integer width below.

## Common Pitfalls

- **Signed overflow in the sum trick.** \`2 * sumSet - sumAll\` in \`int\` is undefined behaviour on large inputs; use \`long long\`, or XOR.
- **\`1 << 31\` on a signed \`int\`.** In the bit-counting follow-up, shift an unsigned \`1u\` instead.
- **Passing the vector by value.** An accidental O(n) copy; use \`const std::vector<int>&\`.
- **\`std::accumulate\` with the wrong initial type.** The type of the third argument is the type of the running total; \`0\` means \`int\`, \`0.0\` would mean \`double\`.
- **Assuming XOR works when a value appears three times.** \`a ^ a ^ a == a\`; ask about the promise first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Baseline:</strong> <span style="color:#f0e2c8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::unordered_map&lt;int, int&gt;</code> of counts is O(n) time and O(n) space; nested loops are O(n²).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Key fact:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ a == 0</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a ^ 0 == a</code>, and XOR is commutative and associative.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Algorithm:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int result = 0; for (int x : nums) result ^= x;</code> and the pairs cancel.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n) time, O(1) extra space; O(n) is optimal because every element must be read.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ note:</strong> <span style="color:#f0e2c8;">XOR cannot overflow, unlike the sum trick, where signed overflow is undefined behaviour. One-liner: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::accumulate</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::bit_xor&lt;int&gt;()</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if every other number appears three times?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count each bit position mod 3 and build the answer in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uint32_t</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1u &lt;&lt; bit</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">static_cast&lt;int32_t&gt;</code> at the end; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 &lt;&lt; 31</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> is not safe.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if two numbers appear once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">XOR all to get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">both</code>, keep its lowest set bit with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">both &amp; (~both + 1u)</code> on unsigned, XOR the numbers with that bit to get one value; the other is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">both ^ a</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the sum trick risky in C++?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The sum of a big <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> vector overflows, and signed overflow is undefined behaviour, so the optimiser may assume it never happens. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>, but it still needs an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unordered_set</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a library function for this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for the problem itself, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::accumulate(v.begin(), v.end(), 0, std::bit_xor&lt;int&gt;())</code> expresses the XOR fold in one line.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you handle 64-bit values?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uint64_t</code>) for the elements and the accumulator; the algorithm is unchanged, and the three-times follow-up loops over 64 bits.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **XOR (exclusive or)** | Bitwise operation: 1 where the two bits differ, 0 where they match |
| **Commutative and associative** | Order and grouping of the operands do not change the result |
| **Extra space (auxiliary space)** | Memory used beyond the input itself |
| **Bitwise operation** | An operation applied to each bit position independently |
| **Bit counting mod k** | Sum each bit position over all numbers and take it mod k |
| **Lowest set bit** | \`x & -x\`: only the lowest 1 bit of x |

---
**Conclusion:** XOR cancels every pair and leaves the single value, so one pass of \`result ^= x\` solves the problem in O(n) time and O(1) extra space, beating an \`unordered_map\` on memory and nested loops on time. In C++ the bit approach is also the *safe* one: XOR cannot overflow, while the sum trick risks signed-overflow undefined behaviour, and in the three-times follow-up you build the answer in \`uint32_t\` and convert once.`,
        examples: [
          {
            label: `singleNumber with XOR, plus a trace of the running value`,
            code: `#include <bitset>
#include <functional>
#include <iostream>
#include <numeric>
#include <vector>

int singleNumber(const std::vector<int>& nums) {
    // XOR everything: pairs cancel (a ^ a = 0), and 0 ^ x = x.
    int result = 0;
    for (int x : nums) result ^= x;
    return result;
}

int singleNumberAccumulate(const std::vector<int>& nums) {
    return std::accumulate(nums.begin(), nums.end(), 0, std::bit_xor<int>());  // same thing
}

int main() {
    std::cout << singleNumber({2, 2, 1}) << "\\n";  // 1
    std::cout << singleNumber({4, 1, 2, 1, 2}) << "\\n";  // 4
    std::cout << singleNumber({1}) << "\\n";  // 1
    std::cout << singleNumber({-3, 7, 7}) << "\\n";  // -3
    std::cout << singleNumber({0, 5, 0}) << "\\n";  // 5
    std::cout << singleNumberAccumulate({9, 3, 9, 8, 3}) << "\\n";  // 8

    // Trace the running XOR on [4, 1, 2, 1, 2].
    int acc = 0;
    for (int x : {4, 1, 2, 1, 2}) {
        acc ^= x;
        std::cout << "^ " << x << " -> " << std::bitset<3>(acc) << " (" << acc << ")\\n";
    }
}`,
          },
          {
            label: `Brute force vs unordered_map vs sort vs sum vs XOR, with work counters`,
            code: `// Five ways to find the single number, with a work counter for each.
#include <algorithm>
#include <iostream>
#include <unordered_map>
#include <unordered_set>
#include <vector>

std::vector<int> build(int pairs, int single, long long seed) {
    std::vector<int> nums;
    for (int i = 1; i <= pairs; i++) {
        int v = i * 7919 % 10007;  // 1000 distinct values
        nums.push_back(v);
        nums.push_back(v);
    }
    nums.push_back(single);
    for (int i = static_cast<int>(nums.size()) - 1; i > 0; i--) {  // Fisher-Yates with a fixed LCG
        seed = seed * 48271 % 2147483647LL;  // long long: the product overflows int
        int j = static_cast<int>(seed % (i + 1));
        std::swap(nums[i], nums[j]);
    }
    return nums;
}

int main() {
    std::vector<int> nums = build(1000, 10012, 7);
    int n = nums.size();
    std::cout << "n = " << n << "\\n";

    long long comparisons = 0;
    int brute = -1;
    for (int x : nums) {
        int count = 0;
        for (int y : nums) {
            comparisons++;
            if (x == y) count++;
        }
        if (count == 1) { brute = x; break; }
    }
    std::cout << "brute force: " << brute << "  comparisons " << comparisons << "\\n";

    std::unordered_map<int, int> counts;
    for (int x : nums) counts[x]++;  // operator[] inserts 0 first, then increments
    int hashed = -1;
    for (auto& [x, c] : counts)
        if (c == 1) hashed = x;
    std::cout << "hash map:    " << hashed << "  entries " << counts.size() << "\\n";

    std::vector<int> s = nums;
    std::sort(s.begin(), s.end());
    int i = 0;
    while (i + 1 < static_cast<int>(s.size()) && s[i] == s[i + 1]) i += 2;
    std::cout << "sort:        " << s[i] << "  pairs checked " << i / 2 << "\\n";

    long long sumAll = 0, sumSet = 0;  // long long: an int sum can overflow on big inputs
    std::unordered_set<int> set(nums.begin(), nums.end());
    for (int x : nums) sumAll += x;
    for (int x : set) sumSet += x;
    std::cout << "sum trick:   " << 2 * sumSet - sumAll << "  sum(all) " << sumAll << "\\n";

    int acc = 0;
    for (int x : nums) acc ^= x;
    std::cout << "xor:         " << acc << "  xor operations " << n << "\\n";
}`,
          },
          {
            label: `Follow-ups: every other value three times, and two single values`,
            code: `// Follow-ups: every other number appears THREE times, or TWO numbers are single.
#include <algorithm>
#include <cstdint>
#include <iostream>
#include <string>
#include <vector>

int singleOfThree(const std::vector<int>& nums) {
    // Count each of the 32 bit positions mod 3; the leftover bits are the answer.
    uint32_t result = 0;  // build it unsigned: 1 << 31 on a signed int is not safe
    for (int bit = 0; bit < 32; bit++) {
        int total = 0;
        for (int x : nums) total += (static_cast<uint32_t>(x) >> bit) & 1u;
        if (total % 3) result |= 1u << bit;
    }
    return static_cast<int32_t>(result);
}

int singleOfThreeStates(const std::vector<int>& nums) {
    // Same idea with two bitmasks: ones/twos hold the count mod 3 of every bit.
    int ones = 0, twos = 0;
    for (int x : nums) {
        ones = (ones ^ x) & ~twos;
        twos = (twos ^ x) & ~ones;
    }
    return ones;
}

std::string twoSingles(const std::vector<int>& nums) {
    // XOR all = a ^ b. Its lowest 1 bit is a bit where a and b differ: split on it.
    uint32_t both = 0;
    for (int x : nums) both ^= static_cast<uint32_t>(x);
    uint32_t low = both & (~both + 1u);  // -both on unsigned: no overflow if both is INT_MIN
    int a = 0;
    for (int x : nums)
        if (static_cast<uint32_t>(x) & low) a ^= x;
    int b = static_cast<int32_t>(both) ^ a;
    return "[" + std::to_string(std::min(a, b)) + ", " + std::to_string(std::max(a, b)) + "]";
}

int main() {
    std::cout << singleOfThree({2, 2, 3, 2}) << "\\n";  // 3
    std::cout << singleOfThree({0, 1, 0, 1, 0, 1, 99}) << "\\n";  // 99
    std::cout << singleOfThree({-2, -2, 1, 1, -3, 1, -3, -3, -4, -2}) << "\\n";  // -4
    std::cout << singleOfThreeStates({-2, -2, 1, 1, -3, 1, -3, -3, -4, -2}) << "\\n";  // -4
    std::cout << twoSingles({1, 2, 1, 3, 2, 5}) << "\\n";  // [3, 5]
    std::cout << twoSingles({-1, 0}) << "\\n";  // [-1, 0]
    std::cout << twoSingles({4, 7, 4, 9, 9, 12}) << "\\n";  // [7, 12]
}`,
          },
        ],
      },
    },
  },
  {
    title: `How do you compute the GCD of two numbers?`,
    difficulty: "easy",
    seoDescription: `Compute the GCD with Euclid's algorithm in O(log n), why it works, the Fibonacci worst case and an overflow-safe LCM, in Python, JavaScript, Java and C++.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Write a Python function that returns the greatest common divisor of two integers. Explain why your method is correct and how fast it is, and tell me how you would get the least common multiple."

**What a strong answer should cover:**
- The brute-force idea (try every divisor, O(min(a, b))) and why Euclid is better.
- Euclid's algorithm \`gcd(a, b) = gcd(b, a % b)\` with base case \`gcd(a, 0) = a\`, and the reason: common divisors of (a, b) and (b, a mod b) are the same.
- O(log min(a, b)) steps, worst case consecutive Fibonacci numbers; iterative O(1) space vs recursive O(log n) stack.
- LCM as \`a // gcd(a, b) * b\` (divide first), and zero/negative inputs.
- Python details: \`math.gcd\` and \`math.lcm\` (both accept any number of arguments since Python 3.9), the tuple swap \`a, b = b, a % b\`, \`%\` takes the sign of the divisor, and ints never overflow.

**Clarifying questions expected:**
- Can inputs be negative or zero?
- Is the LCM needed as well?

**Code / implementation expected:** Yes — an iterative Euclid in Python 3, then a mention of \`math.gcd\`.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know loops and the modulo operator in Python; the math is explained from scratch.  
**Difficulty:** Easy  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are tiling a floor that measures 48 by 18 units and you want the **biggest square tiles** that cover it exactly, with no cutting. Try 18 by 18 tiles first: two fit along the 48 side, and a strip of 12 by 18 is left over. That strip is a smaller version of the same puzzle, so tile it with 12 by 12 squares: one fits, and a 12 by 6 strip is left. Two 6 by 6 squares fill that exactly. Nothing is left over, so 6 by 6 is the largest tile that fits the whole floor.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="A 48 by 18 rectangle covered by two 18 by 18 squares, one 12 by 12 square and two 6 by 6 squares">
  <text class="d-sub" x="280" y="34" text-anchor="middle">48</text>
  <text class="d-sub" x="560" y="146">18</text>
  <rect class="d-box" x="40" y="50" width="180" height="180" rx="4"/>
  <text class="d-text" x="130" y="145" text-anchor="middle">18 x 18</text>
  <rect class="d-box" x="220" y="50" width="180" height="180" rx="4"/>
  <text class="d-text" x="310" y="145" text-anchor="middle">18 x 18</text>
  <rect class="d-box-muted" x="400" y="50" width="120" height="120" rx="4"/>
  <text class="d-text" x="460" y="115" text-anchor="middle">12 x 12</text>
  <rect class="d-box-accent" x="400" y="170" width="60" height="60" rx="4"/>
  <text class="d-text" x="430" y="205" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="460" y="170" width="60" height="60" rx="4"/>
  <text class="d-text" x="490" y="205" text-anchor="middle">6</text>
</svg>

Each step cuts away the largest squares that fit and keeps only the leftover strip. The side of the last square, 6, divides every side that came before it, which is why it tiles the whole floor.

That procedure is **Euclid's algorithm**, written down in Euclid's Elements more than 2,000 years ago and still the standard way to compute the greatest common divisor. Interviewers ask about it because it is short, it has a neat correctness argument, its running time is surprisingly fast (logarithmic), and it is the building block for fractions, least common multiples, modular inverses, and problems like "can these two jugs measure exactly k litres?".

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the inputs be negative? | The GCD is defined as non-negative; take absolute values first, because \`%\` on negatives behaves differently across languages. |
| Can an input be 0? | \`gcd(a, 0) = abs(a)\` and, by convention, \`gcd(0, 0) = 0\`. The loop must handle both. |
| How large can the numbers get? | Euclid is fast for any size, but the LCM (\`a / gcd * b\`) can overflow 32-bit or even 64-bit integers. |
| Do you need the LCM as well? | It comes almost free: \`lcm(a, b) = abs(a) / gcd(a, b) * abs(b)\`. |
| One pair, or the GCD of a whole array? | For an array, fold: \`g = gcd(g, x)\` for each element, and stop early if g reaches 1. |
| May I use the built-in? | Some languages have one, some do not; show Euclid first either way. |

## 3. What Is the GCD?

The **greatest common divisor** of two integers is the largest integer that divides both of them with no remainder. The divisors of 48 are 1, 2, 3, 4, 6, 8, 12, 16, 24, 48; the divisors of 18 are 1, 2, 3, 6, 9, 18. The common ones are 1, 2, 3, 6, so \`gcd(48, 18) = 6\`.

📌 **Interview term: GCD (greatest common divisor)** — the largest integer that divides both a and b. Also called the greatest common factor (GCF) or highest common factor (HCF).

📌 **Interview term: Coprime** — two numbers whose GCD is 1, such as 17 and 5. A fraction a/b is in lowest terms exactly when a and b are coprime.

📌 **Interview term: LCM (least common multiple)** — the smallest positive number that both a and b divide. For non-zero a and b, \`lcm(a, b) = |a| / gcd(a, b) * |b|\`; lcm(48, 18) = 144.

**The brute force** tries every candidate from \`min(a, b)\` down to 1 and returns the first that divides both. It is correct but takes O(min(a, b)) steps: about a million for \`gcd(1000000, 999999)\`. Euclid needs a handful.

## 4. Euclid's Insight

**Any number that divides both a and b also divides a - b.** If a = 6·8 and b = 6·3, then a - b = 6·5. Subtracting b as many times as possible is the same as taking the remainder, so any common divisor of a and b also divides \`a mod b\`, and the reverse holds too. The pairs (a, b) and (b, a mod b) therefore have exactly the same common divisors, so the same GCD:

> **gcd(a, b) = gcd(b, a mod b), and gcd(a, 0) = a.**

Each step replaces the pair with a smaller one, and since the remainder is always smaller than b, the second number eventually hits 0. The first number at that moment is the answer.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 150" role="img" aria-label="Euclid on 48 and 18: gcd of 48 and 18 becomes gcd of 18 and 12, then gcd of 12 and 6, then gcd of 6 and 0, which is 6">
  <defs>
    <marker id="b33q4-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="140" height="54" rx="10"/>
  <text class="d-text" x="90" y="73" text-anchor="middle">gcd(48, 18)</text>
  <path class="d-edge" d="M 162 67 L 204 67" marker-end="url(#b33q4-a1)"/>
  <text class="d-sub" x="185" y="30" text-anchor="middle">48 mod 18</text>
  <rect class="d-box" x="210" y="40" width="140" height="54" rx="10"/>
  <text class="d-text" x="280" y="73" text-anchor="middle">gcd(18, 12)</text>
  <path class="d-edge" d="M 352 67 L 394 67" marker-end="url(#b33q4-a1)"/>
  <text class="d-sub" x="375" y="124" text-anchor="middle">18 mod 12</text>
  <rect class="d-box" x="400" y="40" width="140" height="54" rx="10"/>
  <text class="d-text" x="470" y="73" text-anchor="middle">gcd(12, 6)</text>
  <path class="d-edge" d="M 542 67 L 584 67" marker-end="url(#b33q4-a1)"/>
  <text class="d-sub" x="565" y="30" text-anchor="middle">12 mod 6</text>
  <rect class="d-box-accent" x="590" y="40" width="140" height="54" rx="10"/>
  <text class="d-text" x="660" y="73" text-anchor="middle">gcd(6, 0) = 6</text>
</svg>

Three remainder steps take (48, 18) to (6, 0). The tiling picture in section 1 is the same computation: each "cut away the biggest squares" is one \`mod\`.

📌 **Interview term: Euclidean algorithm** — compute gcd(a, b) by repeatedly replacing (a, b) with (b, a mod b) until b is 0; the remaining a is the GCD.

A trace on a larger pair, as printed by example 1:

| Step | a | b | a = q · b + r |
| :--- | :--- | :--- | :--- |
| 1 | 1071 | 462 | 1071 = 2 · 462 + 147 |
| 2 | 462 | 147 | 462 = 3 · 147 + 21 |
| 3 | 147 | 21 | 147 = 7 · 21 + 0 |
| done | 21 | 0 | gcd = 21 |

Two small observations interviewers like:

- **Order does not matter.** If a < b, the first step computes \`a mod b = a\` and just swaps them: gcd(18, 48) takes one extra step (4 instead of 3 in example 1).
- **Subtraction works but can be terribly slow.** Euclid's original version subtracts the smaller number from the larger. For (1000000, 1) it needs 999,999 subtractions; the modulo version needs 1 step (example 2).

## 5. Why Euclid Is So Fast

After any two steps, the first number has at least halved. (If b ≤ a/2, then the next a is b, already half. If b > a/2, then a mod b = a - b < a/2, and that becomes the number two steps later.) So the number of steps is at most about 2·log2(min(a, b)): O(log min(a, b)).

The worst case is two consecutive **Fibonacci numbers**, because every quotient is 1 and the remainders shrink as slowly as possible: \`gcd(F(n+1), F(n))\` walks all the way down the Fibonacci sequence. Example 2 shows the extremes:

- \`gcd(F(45), F(44)) = gcd(1836311903, 1134903170)\` takes **44** steps, and these are the largest consecutive Fibonacci numbers that fit in a signed 32-bit int.
- The most steps for any pair below 1,000 is **14**.
- (832040, 514229), another Fibonacci pair, takes 28 steps by modulo and also 28 by subtraction, because every quotient is 1; on (1000000, 1) the gap is 999,999 to 1.

📌 **Interview term: Lamé's theorem** — the number of steps of Euclid's algorithm is at most about five times the number of decimal digits of the smaller input; the worst case is consecutive Fibonacci numbers.

## 6. The Code in Python

~~~python
def gcd(a, b):
    """Euclid: gcd(a, b) = gcd(b, a mod b) until b is 0. Returns (gcd, steps)."""
    a, b = abs(a), abs(b)
    steps = 0
    while b:
        a, b = b, a % b
        steps += 1
    return a, steps
~~~

The step counter is only there for the demo; the interview version is three lines:

~~~python
def gcd(a, b):
    a, b = abs(a), abs(b)
    while b:
        a, b = b, a % b
    return a
~~~

And the recursive form and the LCM, from example 1:

~~~python
def gcd_recursive(a, b):
    return abs(a) if b == 0 else gcd_recursive(b, a % b)


def lcm(a, b):
    if a == 0 or b == 0:
        return 0
    g, _ = gcd(a, b)
    return abs(a // g * b)  # divide first: keeps the intermediate small
~~~

**What to point out in this code:**

- \`a, b = b, a % b\` is a simultaneous assignment: the right side is evaluated first, so no temporary variable is needed.
- \`while b:\` loops until b is 0, because 0 is falsy.
- **\`%\` in Python takes the sign of the divisor**: \`-12 % 18\` is 6 and \`12 % -18\` is -6. The \`abs\` calls make the result independent of that rule.
- Python ints never overflow, so \`a * b\` in the LCM is always exact. Dividing first still keeps the intermediate value small, which matters for speed with big numbers.
- **The built-ins:** \`math.gcd\` returns a non-negative result, and since Python 3.9 both \`math.gcd\` and \`math.lcm\` take any number of arguments ([Python docs: math.gcd](https://docs.python.org/3/library/math.html#math.gcd)): \`math.gcd(12, 18, 30)\` is 6 and \`math.lcm(4, 6, 10)\` is 60 in our run. Example 1 checks that \`math.gcd\` agrees on every pair.
- The recursion depth is only O(log n), so Python's default recursion limit (1,000 frames) is never a problem here; the iterative form is still the default answer.

## Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — gcd, step count and lcm for nine pairs, checked against math.gcd, then the trace of gcd(1071, 462)** prints:

~~~text
gcd(48, 18) = 6  steps 3  lcm 144  library agrees true
gcd(18, 48) = 6  steps 4  lcm 144  library agrees true
gcd(17, 5) = 1  steps 3  lcm 85  library agrees true
gcd(100, 75) = 25  steps 2  lcm 300  library agrees true
gcd(0, 7) = 7  steps 1  lcm 0  library agrees true
gcd(7, 0) = 7  steps 0  lcm 0  library agrees true
gcd(0, 0) = 0  steps 0  lcm 0  library agrees true
gcd(-12, 18) = 6  steps 3  lcm 36  library agrees true
gcd(1071, 462) = 21  steps 3  lcm 23562  library agrees true
1071 = 2 * 462 + 147
462 = 3 * 147 + 21
147 = 7 * 21 + 0
gcd = 21
~~~

Note gcd(18, 48) takes one more step than gcd(48, 18): the first step only swaps them. gcd(0, 0) is 0 and every LCM with a zero is 0.

**Example 2 — subtraction vs modulo, the Fibonacci worst case, and how fast lcm(1..k) grows** prints:

~~~text
(48, 18): subtraction 6 in 4 steps, modulo 6 in 3 steps
(1000000, 1): subtraction 1 in 999999 steps, modulo 1 in 1 steps
(832040, 514229): subtraction 1 in 28 steps, modulo 1 in 28 steps
F(45), F(44) = 1836311903, 1134903170: modulo steps 44
most steps for any pair below 1000: 14
lcm(1..10) = 2520
lcm(1..20) = 232792560
lcm(1..30) = 2329089562800
first k that overflows int32: 23 (5354228880, wraps to 1059261584)
~~~

The last line shows that lcm(1..23) = 5,354,228,880 is the first value past the 32-bit limit; a 32-bit int would hold 1,059,261,584 instead. Python does not wrap, so the program computes that value explicitly.

## 7. Complexity

| Method | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (try every d) | O(min(a, b)) | O(1) | one division test per candidate |
| Euclid by subtraction | O(max(a, b)) worst case | O(1) | (n, 1) needs n - 1 subtractions |
| **Euclid by modulo, iterative** | **O(log min(a, b))** | **O(1)** | the larger number halves every two steps |
| Euclid by modulo, recursive | O(log min(a, b)) | O(log min(a, b)) | one stack frame per step; see [recursion and the stack](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) |
| LCM via GCD | O(log min(a, b)) | O(1) | one GCD, one division, one multiplication |
| GCD of an array of n numbers | O(n log M) | O(1) | n folds, M the largest value |

These counts treat one \`%\` as one step, which is true for fixed-size integers. For big integers (hundreds of digits) each division costs more, and binary GCD (Stein's algorithm, which uses only shifts and subtraction) is a common alternative.

## 8. Where GCD Shows Up

- **Simplifying a fraction:** divide numerator and denominator by their GCD; 48/18 becomes 8/3.
- **LCM of many numbers:** fold \`l = l / gcd(l, x) * x\`. lcm(1..20) = 232,792,560, and lcm(1..30) = 2,329,089,562,800, which does not fit in 32 bits (example 2: the first k that overflows is 23).
- **GCD of an array:** fold \`g = gcd(g, x)\`, starting from 0 (because gcd(0, x) = x).
- **Water jug problems:** with jugs of size a and b you can measure exactly the amounts that are multiples of gcd(a, b) (up to a + b).
- **Extended Euclid:** the same recursion can also produce integers x, y with \`a·x + b·y = gcd(a, b)\` (Bézout's identity), which is how modular inverses are computed.

📌 **Interview term: Bézout's identity** — for any integers a and b there are integers x and y with a·x + b·y = gcd(a, b); the extended Euclidean algorithm finds them.

## Edge Cases

- **gcd(a, 0) = |a|**: the loop body never runs and a is returned (gcd(7, 0) = 7, 0 steps).
- **gcd(0, a) = |a|**: one step swaps them (gcd(0, 7) = 7, 1 step).
- **gcd(0, 0) = 0** by convention; LCM with a zero argument is 0.
- **Negative inputs**: take absolute values first; gcd(-12, 18) = 6.
- **a < b**: works unchanged, with one extra swapping step.
- **Coprime inputs**: the answer is 1 (gcd(17, 5) = 1).
- **Huge inputs**: Euclid itself is fine, but \`a * b\` for the LCM can overflow; divide first.

## Common Pitfalls

- **Recursion without the base case.** \`gcd(b, a % b)\` with b = 0 raises \`ZeroDivisionError\`; test \`b == 0\` first.
- **Using \`/\` in the LCM.** \`a / g * b\` returns a float and loses precision for large values; use \`//\`.
- **Forgetting \`abs\`.** Without it, a hand-written gcd can return a negative result for negative inputs (for example 12 and -18 give -6 in Python because \`%\` follows the divisor's sign).
- **Calling \`math.gcd\` with three arguments on old Python.** Multi-argument \`gcd\` and \`math.lcm\` need Python 3.9+; on older versions use \`functools.reduce(math.gcd, nums)\`.
- **The subtraction version.** It is correct but O(max(a, b)) in the worst case; (1000000, 1) takes 999,999 steps.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">The GCD is the largest number dividing both; gcd(48, 18) = 6.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Euclid:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gcd(a, b) = gcd(b, a % b)</code> until b is 0, because (a, b) and (b, a mod b) have the same common divisors.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Python:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a, b = b, a % b</code> in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while b:</code> loop, after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abs</code> on both inputs. Or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">math.gcd</code>, multi-argument since 3.9.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Speed:</strong> <span style="color:#f0e2c8;">O(log min(a, b)): the larger number halves every two steps; the worst case is consecutive Fibonacci numbers (44 steps for F45, F44).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. LCM:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a // gcd(a, b) * b</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">math.lcm</code> (3.9+); 0 if either is 0.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is Euclid correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Any d dividing a and b divides <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a - q*b = a % b</code>, and any d dividing b and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a % b</code> divides a. So both pairs have the same set of common divisors, hence the same greatest one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the worst case for the number of steps?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Consecutive Fibonacci numbers, where every quotient is 1. gcd(1836311903, 1134903170) takes 44 steps; below 1,000 no pair needs more than 14.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Recursive or iterative in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both are fine because the depth is only O(log n), far below the 1,000-frame recursion limit. Iterative uses O(1) space and is what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">math.gcd</code> effectively does.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you compute the GCD of a list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools.reduce(math.gcd, nums)</code>, or on 3.9+ simply <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">math.gcd(*nums)</code>; stop early if the running value hits 1.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the LCM overflow in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, Python ints are unbounded. lcm(1..30) = 2329089562800 is exact; in Java or C++ the same loop in 32-bit ints would wrap at k = 23.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **GCD (greatest common divisor)** | Largest integer dividing both numbers |
| **Coprime** | GCD equal to 1 |
| **LCM (least common multiple)** | Smallest positive common multiple: \`abs(a) / gcd * abs(b)\` |
| **Euclidean algorithm** | Replace (a, b) by (b, a mod b) until b is 0 |
| **Lamé's theorem** | Euclid's step count is logarithmic; worst case is consecutive Fibonacci numbers |
| **Bézout's identity** | a·x + b·y = gcd(a, b) has integer solutions |

---
**Conclusion:** Euclid's algorithm replaces (a, b) with (b, a mod b) until b is 0, because both pairs share exactly the same common divisors; it needs only O(log min(a, b)) steps, with consecutive Fibonacci numbers as the worst case, and the LCM follows as \`a // gcd * b\`. In Python the loop is three lines with \`a, b = b, a % b\`, \`math.gcd\` and \`math.lcm\` cover production use (multi-argument from 3.9), and unbounded ints mean the LCM never overflows, though you should still divide before multiplying.`,
        examples: [
          {
            label: `Euclid with step counts, LCM and a trace`,
            code: `import math


def gcd(a, b):
    """Euclid: gcd(a, b) = gcd(b, a mod b) until b is 0. Returns (gcd, steps)."""
    a, b = abs(a), abs(b)
    steps = 0
    while b:
        a, b = b, a % b
        steps += 1
    return a, steps


def gcd_recursive(a, b):
    return abs(a) if b == 0 else gcd_recursive(b, a % b)


def lcm(a, b):
    if a == 0 or b == 0:
        return 0
    g, _ = gcd(a, b)
    return abs(a // g * b)  # divide first: keeps the intermediate small


for a, b in [(48, 18), (18, 48), (17, 5), (100, 75), (0, 7), (7, 0), (0, 0), (-12, 18), (1071, 462)]:
    g, steps = gcd(a, b)
    ok = g == math.gcd(a, b) == gcd_recursive(a, b)
    print("gcd(" + str(a) + ", " + str(b) + ") = " + str(g) + "  steps " + str(steps)
          + "  lcm " + str(lcm(a, b)) + "  library agrees " + str(ok).lower())

# Trace Euclid on 1071 and 462.
a, b = 1071, 462
while b:
    print(str(a) + " = " + str(a // b) + " * " + str(b) + " + " + str(a % b))
    a, b = b, a % b
print("gcd = " + str(a))`,
          },
          {
            label: `Subtraction vs modulo, Fibonacci worst case, lcm(1..k)`,
            code: `import math


def gcd_subtract(a, b):
    """Euclid's original idea: subtract the smaller from the larger. Returns (gcd, steps)."""
    steps = 0
    while a != b:
        if a > b:
            a -= b
        else:
            b -= a
        steps += 1
    return a, steps


def gcd_mod(a, b):
    steps = 0
    while b:
        a, b = b, a % b
        steps += 1
    return a, steps


for a, b in [(48, 18), (1000000, 1), (832040, 514229)]:
    gs, ss = gcd_subtract(a, b)
    gm, sm = gcd_mod(a, b)
    print("(" + str(a) + ", " + str(b) + "): subtraction " + str(gs) + " in " + str(ss)
          + " steps, modulo " + str(gm) + " in " + str(sm) + " steps")

# Worst case for Euclid: consecutive Fibonacci numbers (every quotient is 1).
fib = [1, 1]
while len(fib) < 46:
    fib.append(fib[-1] + fib[-2])
print("F(45), F(44) = " + str(fib[45]) + ", " + str(fib[44]) + ": modulo steps " + str(gcd_mod(fib[45], fib[44])[1]))
print("most steps for any pair below 1000: " + str(max(gcd_mod(a, b)[1] for a in range(1, 1000) for b in range(1, a + 1))))

# lcm(1..k) grows fast. Python ints never overflow, but a 32-bit int would.
lcm = 1
first_big = None
for k in range(1, 31):
    lcm = lcm // math.gcd(lcm, k) * k
    if first_big is None and lcm > 2147483647:
        first_big = (k, lcm)
    if k in (10, 20, 30):
        print("lcm(1.." + str(k) + ") = " + str(lcm))
k, value = first_big
wrapped = (value & 0xFFFFFFFF) - (1 << 32) if value & 0x80000000 else value & 0xFFFFFFFF
print("first k that overflows int32: " + str(k) + " (" + str(value) + ", wraps to " + str(wrapped) + ")")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Write a JavaScript function that returns the greatest common divisor of two integers. Explain why it is correct and how fast it is, and how you would get the least common multiple."

**What a strong answer should cover:**
- The brute-force idea (try every divisor, O(min(a, b))) and why Euclid is better.
- Euclid's algorithm \`gcd(a, b) = gcd(b, a % b)\` with base case \`gcd(a, 0) = a\`, and why it is correct.
- O(log min(a, b)) steps, worst case consecutive Fibonacci numbers; iterative vs recursive.
- LCM as \`a / gcd(a, b) * b\` (divide first), and zero/negative inputs.
- JavaScript details: there is no built-in gcd; \`%\` keeps the sign of the dividend, so take \`Math.abs\` first; Numbers are exact integers only up to 2^53, so large LCMs need \`BigInt\` (\`10n % 4n\`); destructuring \`[a, b] = [b, a % b]\` swaps.

**Clarifying questions expected:**
- Can inputs be negative or zero?
- How large can the values (and the LCM) get?

**Code / implementation expected:** Yes — an iterative Euclid in JavaScript, plus a BigInt version for large values.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know loops and the modulo operator in JavaScript; the math is explained from scratch.  
**Difficulty:** Easy  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are tiling a floor that measures 48 by 18 units and you want the **biggest square tiles** that cover it exactly, with no cutting. Try 18 by 18 tiles first: two fit along the 48 side, and a strip of 12 by 18 is left over. That strip is a smaller version of the same puzzle, so tile it with 12 by 12 squares: one fits, and a 12 by 6 strip is left. Two 6 by 6 squares fill that exactly. Nothing is left over, so 6 by 6 is the largest tile that fits the whole floor.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="A 48 by 18 rectangle covered by two 18 by 18 squares, one 12 by 12 square and two 6 by 6 squares">
  <text class="d-sub" x="280" y="34" text-anchor="middle">48</text>
  <text class="d-sub" x="560" y="146">18</text>
  <rect class="d-box" x="40" y="50" width="180" height="180" rx="4"/>
  <text class="d-text" x="130" y="145" text-anchor="middle">18 x 18</text>
  <rect class="d-box" x="220" y="50" width="180" height="180" rx="4"/>
  <text class="d-text" x="310" y="145" text-anchor="middle">18 x 18</text>
  <rect class="d-box-muted" x="400" y="50" width="120" height="120" rx="4"/>
  <text class="d-text" x="460" y="115" text-anchor="middle">12 x 12</text>
  <rect class="d-box-accent" x="400" y="170" width="60" height="60" rx="4"/>
  <text class="d-text" x="430" y="205" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="460" y="170" width="60" height="60" rx="4"/>
  <text class="d-text" x="490" y="205" text-anchor="middle">6</text>
</svg>

Each step cuts away the largest squares that fit and keeps only the leftover strip. The side of the last square, 6, divides every side that came before it, which is why it tiles the whole floor.

That procedure is **Euclid's algorithm**, written down in Euclid's Elements more than 2,000 years ago and still the standard way to compute the greatest common divisor. Interviewers ask about it because it is short, it has a neat correctness argument, its running time is surprisingly fast (logarithmic), and it is the building block for fractions, least common multiples, modular inverses, and problems like "can these two jugs measure exactly k litres?".

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the inputs be negative? | The GCD is defined as non-negative; take absolute values first, because \`%\` on negatives behaves differently across languages. |
| Can an input be 0? | \`gcd(a, 0) = abs(a)\` and, by convention, \`gcd(0, 0) = 0\`. The loop must handle both. |
| How large can the numbers get? | Euclid is fast for any size, but the LCM (\`a / gcd * b\`) can overflow 32-bit or even 64-bit integers. |
| Do you need the LCM as well? | It comes almost free: \`lcm(a, b) = abs(a) / gcd(a, b) * abs(b)\`. |
| One pair, or the GCD of a whole array? | For an array, fold: \`g = gcd(g, x)\` for each element, and stop early if g reaches 1. |
| May I use the built-in? | Some languages have one, some do not; show Euclid first either way. |

## 3. What Is the GCD?

The **greatest common divisor** of two integers is the largest integer that divides both of them with no remainder. The divisors of 48 are 1, 2, 3, 4, 6, 8, 12, 16, 24, 48; the divisors of 18 are 1, 2, 3, 6, 9, 18. The common ones are 1, 2, 3, 6, so \`gcd(48, 18) = 6\`.

📌 **Interview term: GCD (greatest common divisor)** — the largest integer that divides both a and b. Also called the greatest common factor (GCF) or highest common factor (HCF).

📌 **Interview term: Coprime** — two numbers whose GCD is 1, such as 17 and 5. A fraction a/b is in lowest terms exactly when a and b are coprime.

📌 **Interview term: LCM (least common multiple)** — the smallest positive number that both a and b divide. For non-zero a and b, \`lcm(a, b) = |a| / gcd(a, b) * |b|\`; lcm(48, 18) = 144.

**The brute force** tries every candidate from \`min(a, b)\` down to 1 and returns the first that divides both. It is correct but takes O(min(a, b)) steps: about a million for \`gcd(1000000, 999999)\`. Euclid needs a handful.

## 4. Euclid's Insight

**Any number that divides both a and b also divides a - b.** If a = 6·8 and b = 6·3, then a - b = 6·5. Subtracting b as many times as possible is the same as taking the remainder, so any common divisor of a and b also divides \`a mod b\`, and the reverse holds too. The pairs (a, b) and (b, a mod b) therefore have exactly the same common divisors, so the same GCD:

> **gcd(a, b) = gcd(b, a mod b), and gcd(a, 0) = a.**

Each step replaces the pair with a smaller one, and since the remainder is always smaller than b, the second number eventually hits 0. The first number at that moment is the answer.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 150" role="img" aria-label="Euclid on 48 and 18: gcd of 48 and 18 becomes gcd of 18 and 12, then gcd of 12 and 6, then gcd of 6 and 0, which is 6">
  <defs>
    <marker id="b33q4-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="140" height="54" rx="10"/>
  <text class="d-text" x="90" y="73" text-anchor="middle">gcd(48, 18)</text>
  <path class="d-edge" d="M 162 67 L 204 67" marker-end="url(#b33q4-a1)"/>
  <text class="d-sub" x="185" y="30" text-anchor="middle">48 mod 18</text>
  <rect class="d-box" x="210" y="40" width="140" height="54" rx="10"/>
  <text class="d-text" x="280" y="73" text-anchor="middle">gcd(18, 12)</text>
  <path class="d-edge" d="M 352 67 L 394 67" marker-end="url(#b33q4-a1)"/>
  <text class="d-sub" x="375" y="124" text-anchor="middle">18 mod 12</text>
  <rect class="d-box" x="400" y="40" width="140" height="54" rx="10"/>
  <text class="d-text" x="470" y="73" text-anchor="middle">gcd(12, 6)</text>
  <path class="d-edge" d="M 542 67 L 584 67" marker-end="url(#b33q4-a1)"/>
  <text class="d-sub" x="565" y="30" text-anchor="middle">12 mod 6</text>
  <rect class="d-box-accent" x="590" y="40" width="140" height="54" rx="10"/>
  <text class="d-text" x="660" y="73" text-anchor="middle">gcd(6, 0) = 6</text>
</svg>

Three remainder steps take (48, 18) to (6, 0). The tiling picture in section 1 is the same computation: each "cut away the biggest squares" is one \`mod\`.

📌 **Interview term: Euclidean algorithm** — compute gcd(a, b) by repeatedly replacing (a, b) with (b, a mod b) until b is 0; the remaining a is the GCD.

A trace on a larger pair, as printed by example 1:

| Step | a | b | a = q · b + r |
| :--- | :--- | :--- | :--- |
| 1 | 1071 | 462 | 1071 = 2 · 462 + 147 |
| 2 | 462 | 147 | 462 = 3 · 147 + 21 |
| 3 | 147 | 21 | 147 = 7 · 21 + 0 |
| done | 21 | 0 | gcd = 21 |

Two small observations interviewers like:

- **Order does not matter.** If a < b, the first step computes \`a mod b = a\` and just swaps them: gcd(18, 48) takes one extra step (4 instead of 3 in example 1).
- **Subtraction works but can be terribly slow.** Euclid's original version subtracts the smaller number from the larger. For (1000000, 1) it needs 999,999 subtractions; the modulo version needs 1 step (example 2).

## 5. Why Euclid Is So Fast

After any two steps, the first number has at least halved. (If b ≤ a/2, then the next a is b, already half. If b > a/2, then a mod b = a - b < a/2, and that becomes the number two steps later.) So the number of steps is at most about 2·log2(min(a, b)): O(log min(a, b)).

The worst case is two consecutive **Fibonacci numbers**, because every quotient is 1 and the remainders shrink as slowly as possible: \`gcd(F(n+1), F(n))\` walks all the way down the Fibonacci sequence. Example 2 shows the extremes:

- \`gcd(F(45), F(44)) = gcd(1836311903, 1134903170)\` takes **44** steps, and these are the largest consecutive Fibonacci numbers that fit in a signed 32-bit int.
- The most steps for any pair below 1,000 is **14**.
- (832040, 514229), another Fibonacci pair, takes 28 steps by modulo and also 28 by subtraction, because every quotient is 1; on (1000000, 1) the gap is 999,999 to 1.

📌 **Interview term: Lamé's theorem** — the number of steps of Euclid's algorithm is at most about five times the number of decimal digits of the smaller input; the worst case is consecutive Fibonacci numbers.

## 6. The Code in JavaScript

~~~javascript
function gcd(a, b) {
  // Euclid: gcd(a, b) = gcd(b, a mod b) until b is 0. Returns [gcd, steps].
  a = Math.abs(a);
  b = Math.abs(b);
  let steps = 0;
  while (b !== 0) {
    [a, b] = [b, a % b];
    steps++;
  }
  return [a, steps];
}
~~~

The step counter is only there for the demo; the interview version:

~~~javascript
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}
~~~

The BigInt version and the LCM, from example 1:

~~~javascript
function gcdBig(a, b) {
  // JavaScript has no built-in gcd; this BigInt version works for any size.
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs((a / gcd(a, b)[0]) * b); // divide first: keeps the intermediate small
}
~~~

**What to point out in this code:**

- **JavaScript has no built-in gcd** (neither \`Math\` nor \`BigInt\` has one), so you always write it.
- \`[a, b] = [b, a % b]\` evaluates the right side first, so it is a correct simultaneous update. It allocates a small array each step; a temporary variable is the faster style for hot loops.
- **\`%\` keeps the sign of the dividend:** \`-12 % 18\` is -12 in JavaScript (it is 6 in Python). Taking \`Math.abs\` up front makes the result non-negative.
- **Precision:** Numbers are 64-bit floats, exact for integers only up to 2^53 (\`2 ** 53 + 1\` prints 9007199254740992 in our run). Euclid's remainders never exceed the inputs, so gcd is exact for any safe integer, but \`a * b\` in an LCM can pass 2^53. Dividing first (\`a / g * b\`) is exact while the final result is safe; beyond that, use \`BigInt\`.
- For BigInt, every literal needs the \`n\` suffix (\`0n\`), \`Math.abs\` does not accept BigInt (hence the manual sign flip), and BigInt \`%\` also keeps the dividend's sign.

## Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — gcd, step count and lcm for nine pairs, checked against the recursive and BigInt versions, then the trace of gcd(1071, 462)** prints:

~~~text
gcd(48, 18) = 6  steps 3  lcm 144  library agrees true
gcd(18, 48) = 6  steps 4  lcm 144  library agrees true
gcd(17, 5) = 1  steps 3  lcm 85  library agrees true
gcd(100, 75) = 25  steps 2  lcm 300  library agrees true
gcd(0, 7) = 7  steps 1  lcm 0  library agrees true
gcd(7, 0) = 7  steps 0  lcm 0  library agrees true
gcd(0, 0) = 0  steps 0  lcm 0  library agrees true
gcd(-12, 18) = 6  steps 3  lcm 36  library agrees true
gcd(1071, 462) = 21  steps 3  lcm 23562  library agrees true
1071 = 2 * 462 + 147
462 = 3 * 147 + 21
147 = 7 * 21 + 0
gcd = 21
~~~

Note gcd(18, 48) takes one more step than gcd(48, 18): the first step only swaps them. The trace uses \`Math.floor(a / b)\` for the quotient, since \`/\` is float division.

**Example 2 — subtraction vs modulo, the Fibonacci worst case, and how fast lcm(1..k) grows** prints:

~~~text
(48, 18): subtraction 6 in 4 steps, modulo 6 in 3 steps
(1000000, 1): subtraction 1 in 999999 steps, modulo 1 in 1 steps
(832040, 514229): subtraction 1 in 28 steps, modulo 1 in 28 steps
F(45), F(44) = 1836311903, 1134903170: modulo steps 44
most steps for any pair below 1000: 14
lcm(1..10) = 2520
lcm(1..20) = 232792560
lcm(1..30) = 2329089562800
first k that overflows int32: 23 (5354228880, wraps to 1059261584)
~~~

lcm(1..30) = 2,329,089,562,800 is still exact as a Number (below 2^53). The last line uses \`firstValue | 0\` to show what a 32-bit integer would hold: 1,059,261,584.

## 7. Complexity

| Method | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (try every d) | O(min(a, b)) | O(1) | one division test per candidate |
| Euclid by subtraction | O(max(a, b)) worst case | O(1) | (n, 1) needs n - 1 subtractions |
| **Euclid by modulo, iterative** | **O(log min(a, b))** | **O(1)** | the larger number halves every two steps |
| Euclid by modulo, recursive | O(log min(a, b)) | O(log min(a, b)) | one stack frame per step; see [recursion and the stack](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) |
| LCM via GCD | O(log min(a, b)) | O(1) | one GCD, one division, one multiplication |
| GCD of an array of n numbers | O(n log M) | O(1) | n folds, M the largest value |

These counts treat one \`%\` as one step, which is true for fixed-size integers. For big integers (hundreds of digits) each division costs more, and binary GCD (Stein's algorithm, which uses only shifts and subtraction) is a common alternative.

## 8. Where GCD Shows Up

- **Simplifying a fraction:** divide numerator and denominator by their GCD; 48/18 becomes 8/3.
- **LCM of many numbers:** fold \`l = l / gcd(l, x) * x\`. lcm(1..20) = 232,792,560, and lcm(1..30) = 2,329,089,562,800, which does not fit in 32 bits (example 2: the first k that overflows is 23).
- **GCD of an array:** fold \`g = gcd(g, x)\`, starting from 0 (because gcd(0, x) = x).
- **Water jug problems:** with jugs of size a and b you can measure exactly the amounts that are multiples of gcd(a, b) (up to a + b).
- **Extended Euclid:** the same recursion can also produce integers x, y with \`a·x + b·y = gcd(a, b)\` (Bézout's identity), which is how modular inverses are computed.

📌 **Interview term: Bézout's identity** — for any integers a and b there are integers x and y with a·x + b·y = gcd(a, b); the extended Euclidean algorithm finds them.

## Edge Cases

- **gcd(a, 0) = |a|**: the loop body never runs and a is returned (gcd(7, 0) = 7, 0 steps).
- **gcd(0, a) = |a|**: one step swaps them (gcd(0, 7) = 7, 1 step).
- **gcd(0, 0) = 0** by convention; LCM with a zero argument is 0.
- **Negative inputs**: take absolute values first; gcd(-12, 18) = 6.
- **a < b**: works unchanged, with one extra swapping step.
- **Coprime inputs**: the answer is 1 (gcd(17, 5) = 1).
- **Huge inputs**: Euclid itself is fine, but \`a * b\` for the LCM can overflow; divide first.

## Common Pitfalls

- **Negative inputs without \`Math.abs\`.** \`%\` keeps the dividend's sign, so a hand-written gcd can return a negative number.
- **Multiplying before dividing in the LCM.** \`a * b / g\` can pass 2^53 and silently round; use \`a / g * b\`, or BigInt.
- **Using \`|0\` or bitwise tricks on large values.** They truncate to 32 bits; Euclid only needs \`%\`.
- **Mixing BigInt and Number.** \`10n % 4\` throws \`TypeError\`; convert both sides.
- **Float inputs.** \`gcd(0.3, 0.1)\` runs on doubles and does not mean anything useful; validate with \`Number.isInteger\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">The GCD is the largest number dividing both; gcd(48, 18) = 6.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Euclid:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gcd(a, b) = gcd(b, a % b)</code> until b is 0, because (a, b) and (b, a mod b) have the same common divisors.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. JavaScript:</strong> <span style="color:#f0e2c8;">No built-in: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.abs</code> both, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">while (b !== 0) [a, b] = [b, a % b];</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">%</code> keeps the dividend's sign.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Speed:</strong> <span style="color:#f0e2c8;">O(log min(a, b)): the larger number halves every two steps; the worst case is consecutive Fibonacci numbers (44 steps for F45, F44).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. LCM:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a / gcd(a, b) * b</code>, dividing first; past 2^53 switch to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInt</code> (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0n</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">%</code> works the same).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is Euclid correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Any d dividing a and b divides <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a % b</code>, and any d dividing b and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a % b</code> divides a. Both pairs have the same common divisors, so the same greatest one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the numbers are larger than 2^53?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Numbers can no longer represent every integer, so use BigInt: the same loop with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0n</code> and BigInt literals. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.abs</code> does not accept BigInt, so flip the sign manually.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the recursive version safe in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the depth is O(log n), at most a few dozen frames for safe integers. Engines do not reliably eliminate tail calls, but here it does not matter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you compute the GCD of an array?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums.reduce((g, x) =&gt; gcd(g, x), 0)</code>, since gcd(0, x) = x; you can stop early once g is 1.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does lcm(1..30) look like in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">2329089562800, exact because it is below 2^53. It would overflow a 32-bit int, which first happens at k = 23.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **GCD (greatest common divisor)** | Largest integer dividing both numbers |
| **Coprime** | GCD equal to 1 |
| **LCM (least common multiple)** | Smallest positive common multiple: \`abs(a) / gcd * abs(b)\` |
| **Euclidean algorithm** | Replace (a, b) by (b, a mod b) until b is 0 |
| **Lamé's theorem** | Euclid's step count is logarithmic; worst case is consecutive Fibonacci numbers |
| **Bézout's identity** | a·x + b·y = gcd(a, b) has integer solutions |

---
**Conclusion:** Euclid's algorithm replaces (a, b) with (b, a mod b) until b is 0, because both pairs share exactly the same common divisors; it needs only O(log min(a, b)) steps, with consecutive Fibonacci numbers as the worst case, and the LCM follows as \`a / gcd * b\`. JavaScript has no built-in gcd, so you write the loop yourself: take \`Math.abs\` first because \`%\` keeps the dividend's sign, divide before multiplying in the LCM, and switch to \`BigInt\` once values can pass 2^53.`,
        examples: [
          {
            label: `Euclid with step counts, LCM, BigInt and a trace`,
            code: `function gcd(a, b) {
  // Euclid: gcd(a, b) = gcd(b, a mod b) until b is 0. Returns [gcd, steps].
  a = Math.abs(a);
  b = Math.abs(b);
  let steps = 0;
  while (b !== 0) {
    [a, b] = [b, a % b];
    steps++;
  }
  return [a, steps];
}

function gcdRecursive(a, b) {
  return b === 0 ? Math.abs(a) : gcdRecursive(b, a % b);
}

function gcdBig(a, b) {
  // JavaScript has no built-in gcd; this BigInt version works for any size.
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs((a / gcd(a, b)[0]) * b); // divide first: keeps the intermediate small
}

const pairs = [[48, 18], [18, 48], [17, 5], [100, 75], [0, 7], [7, 0], [0, 0], [-12, 18], [1071, 462]];
for (const [a, b] of pairs) {
  const [g, steps] = gcd(a, b);
  const ok = g === gcdRecursive(a, b) && BigInt(g) === gcdBig(BigInt(a), BigInt(b));
  console.log('gcd(' + a + ', ' + b + ') = ' + g + '  steps ' + steps +
    '  lcm ' + lcm(a, b) + '  library agrees ' + ok);
}

// Trace Euclid on 1071 and 462.
let a = 1071, b = 462;
while (b !== 0) {
  console.log(a + ' = ' + Math.floor(a / b) + ' * ' + b + ' + ' + (a % b));
  [a, b] = [b, a % b];
}
console.log('gcd = ' + a);`,
          },
          {
            label: `Subtraction vs modulo, Fibonacci worst case, lcm(1..k)`,
            code: `function gcdSubtract(a, b) {
  // Euclid's original idea: subtract the smaller from the larger.
  let steps = 0;
  while (a !== b) {
    if (a > b) a -= b;
    else b -= a;
    steps++;
  }
  return [a, steps];
}

function gcdMod(a, b) {
  let steps = 0;
  while (b !== 0) {
    [a, b] = [b, a % b];
    steps++;
  }
  return [a, steps];
}

for (const [a, b] of [[48, 18], [1000000, 1], [832040, 514229]]) {
  const [gs, ss] = gcdSubtract(a, b);
  const [gm, sm] = gcdMod(a, b);
  console.log('(' + a + ', ' + b + '): subtraction ' + gs + ' in ' + ss + ' steps, modulo ' + gm + ' in ' + sm + ' steps');
}

// Worst case for Euclid: consecutive Fibonacci numbers (every quotient is 1).
const fib = [1, 1];
while (fib.length < 46) fib.push(fib[fib.length - 1] + fib[fib.length - 2]);
console.log('F(45), F(44) = ' + fib[45] + ', ' + fib[44] + ': modulo steps ' + gcdMod(fib[45], fib[44])[1]);
let most = 0;
for (let a = 1; a < 1000; a++) for (let b = 1; b <= a; b++) most = Math.max(most, gcdMod(a, b)[1]);
console.log('most steps for any pair below 1000: ' + most);

// lcm(1..k) grows fast. Doubles are exact up to 2^53, so this is still exact here.
let lcm = 1, firstK = 0, firstValue = 0;
for (let k = 1; k <= 30; k++) {
  lcm = (lcm / gcdMod(lcm, k)[0]) * k;
  if (firstK === 0 && lcm > 2147483647) { firstK = k; firstValue = lcm; }
  if (k === 10 || k === 20 || k === 30) console.log('lcm(1..' + k + ') = ' + lcm);
}
console.log('first k that overflows int32: ' + firstK + ' (' + firstValue + ', wraps to ' + (firstValue | 0) + ')');`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Write a Java method that returns the greatest common divisor of two \`int\`s. Explain why it is correct and how fast it is, and how you would get the least common multiple without overflow."

**What a strong answer should cover:**
- The brute-force idea (try every divisor, O(min(a, b))) and why Euclid is better.
- Euclid's algorithm \`gcd(a, b) = gcd(b, a % b)\` with base case \`gcd(a, 0) = a\`, and why it is correct.
- O(log min(a, b)) steps, worst case consecutive Fibonacci numbers; iterative vs recursive.
- LCM as \`(long) (a / gcd(a, b)) * b\`: divide first, multiply in \`long\`.
- Java details: there is no \`Math.gcd\`, but \`BigInteger.gcd\` exists; \`%\` keeps the dividend's sign; \`Math.abs(Integer.MIN_VALUE)\` is still negative; \`int\` overflow wraps silently.

**Clarifying questions expected:**
- Can inputs be negative or zero?
- How large can the LCM get: \`int\`, \`long\`, or arbitrary?

**Code / implementation expected:** Yes — an iterative Euclid in Java and an overflow-safe LCM returning \`long\`.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know loops and the modulo operator in Java; the math is explained from scratch.  
**Difficulty:** Easy  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are tiling a floor that measures 48 by 18 units and you want the **biggest square tiles** that cover it exactly, with no cutting. Try 18 by 18 tiles first: two fit along the 48 side, and a strip of 12 by 18 is left over. That strip is a smaller version of the same puzzle, so tile it with 12 by 12 squares: one fits, and a 12 by 6 strip is left. Two 6 by 6 squares fill that exactly. Nothing is left over, so 6 by 6 is the largest tile that fits the whole floor.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="A 48 by 18 rectangle covered by two 18 by 18 squares, one 12 by 12 square and two 6 by 6 squares">
  <text class="d-sub" x="280" y="34" text-anchor="middle">48</text>
  <text class="d-sub" x="560" y="146">18</text>
  <rect class="d-box" x="40" y="50" width="180" height="180" rx="4"/>
  <text class="d-text" x="130" y="145" text-anchor="middle">18 x 18</text>
  <rect class="d-box" x="220" y="50" width="180" height="180" rx="4"/>
  <text class="d-text" x="310" y="145" text-anchor="middle">18 x 18</text>
  <rect class="d-box-muted" x="400" y="50" width="120" height="120" rx="4"/>
  <text class="d-text" x="460" y="115" text-anchor="middle">12 x 12</text>
  <rect class="d-box-accent" x="400" y="170" width="60" height="60" rx="4"/>
  <text class="d-text" x="430" y="205" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="460" y="170" width="60" height="60" rx="4"/>
  <text class="d-text" x="490" y="205" text-anchor="middle">6</text>
</svg>

Each step cuts away the largest squares that fit and keeps only the leftover strip. The side of the last square, 6, divides every side that came before it, which is why it tiles the whole floor.

That procedure is **Euclid's algorithm**, written down in Euclid's Elements more than 2,000 years ago and still the standard way to compute the greatest common divisor. Interviewers ask about it because it is short, it has a neat correctness argument, its running time is surprisingly fast (logarithmic), and it is the building block for fractions, least common multiples, modular inverses, and problems like "can these two jugs measure exactly k litres?".

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the inputs be negative? | The GCD is defined as non-negative; take absolute values first, because \`%\` on negatives behaves differently across languages. |
| Can an input be 0? | \`gcd(a, 0) = abs(a)\` and, by convention, \`gcd(0, 0) = 0\`. The loop must handle both. |
| How large can the numbers get? | Euclid is fast for any size, but the LCM (\`a / gcd * b\`) can overflow 32-bit or even 64-bit integers. |
| Do you need the LCM as well? | It comes almost free: \`lcm(a, b) = abs(a) / gcd(a, b) * abs(b)\`. |
| One pair, or the GCD of a whole array? | For an array, fold: \`g = gcd(g, x)\` for each element, and stop early if g reaches 1. |
| May I use the built-in? | Some languages have one, some do not; show Euclid first either way. |

## 3. What Is the GCD?

The **greatest common divisor** of two integers is the largest integer that divides both of them with no remainder. The divisors of 48 are 1, 2, 3, 4, 6, 8, 12, 16, 24, 48; the divisors of 18 are 1, 2, 3, 6, 9, 18. The common ones are 1, 2, 3, 6, so \`gcd(48, 18) = 6\`.

📌 **Interview term: GCD (greatest common divisor)** — the largest integer that divides both a and b. Also called the greatest common factor (GCF) or highest common factor (HCF).

📌 **Interview term: Coprime** — two numbers whose GCD is 1, such as 17 and 5. A fraction a/b is in lowest terms exactly when a and b are coprime.

📌 **Interview term: LCM (least common multiple)** — the smallest positive number that both a and b divide. For non-zero a and b, \`lcm(a, b) = |a| / gcd(a, b) * |b|\`; lcm(48, 18) = 144.

**The brute force** tries every candidate from \`min(a, b)\` down to 1 and returns the first that divides both. It is correct but takes O(min(a, b)) steps: about a million for \`gcd(1000000, 999999)\`. Euclid needs a handful.

## 4. Euclid's Insight

**Any number that divides both a and b also divides a - b.** If a = 6·8 and b = 6·3, then a - b = 6·5. Subtracting b as many times as possible is the same as taking the remainder, so any common divisor of a and b also divides \`a mod b\`, and the reverse holds too. The pairs (a, b) and (b, a mod b) therefore have exactly the same common divisors, so the same GCD:

> **gcd(a, b) = gcd(b, a mod b), and gcd(a, 0) = a.**

Each step replaces the pair with a smaller one, and since the remainder is always smaller than b, the second number eventually hits 0. The first number at that moment is the answer.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 150" role="img" aria-label="Euclid on 48 and 18: gcd of 48 and 18 becomes gcd of 18 and 12, then gcd of 12 and 6, then gcd of 6 and 0, which is 6">
  <defs>
    <marker id="b33q4-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="140" height="54" rx="10"/>
  <text class="d-text" x="90" y="73" text-anchor="middle">gcd(48, 18)</text>
  <path class="d-edge" d="M 162 67 L 204 67" marker-end="url(#b33q4-a1)"/>
  <text class="d-sub" x="185" y="30" text-anchor="middle">48 mod 18</text>
  <rect class="d-box" x="210" y="40" width="140" height="54" rx="10"/>
  <text class="d-text" x="280" y="73" text-anchor="middle">gcd(18, 12)</text>
  <path class="d-edge" d="M 352 67 L 394 67" marker-end="url(#b33q4-a1)"/>
  <text class="d-sub" x="375" y="124" text-anchor="middle">18 mod 12</text>
  <rect class="d-box" x="400" y="40" width="140" height="54" rx="10"/>
  <text class="d-text" x="470" y="73" text-anchor="middle">gcd(12, 6)</text>
  <path class="d-edge" d="M 542 67 L 584 67" marker-end="url(#b33q4-a1)"/>
  <text class="d-sub" x="565" y="30" text-anchor="middle">12 mod 6</text>
  <rect class="d-box-accent" x="590" y="40" width="140" height="54" rx="10"/>
  <text class="d-text" x="660" y="73" text-anchor="middle">gcd(6, 0) = 6</text>
</svg>

Three remainder steps take (48, 18) to (6, 0). The tiling picture in section 1 is the same computation: each "cut away the biggest squares" is one \`mod\`.

📌 **Interview term: Euclidean algorithm** — compute gcd(a, b) by repeatedly replacing (a, b) with (b, a mod b) until b is 0; the remaining a is the GCD.

A trace on a larger pair, as printed by example 1:

| Step | a | b | a = q · b + r |
| :--- | :--- | :--- | :--- |
| 1 | 1071 | 462 | 1071 = 2 · 462 + 147 |
| 2 | 462 | 147 | 462 = 3 · 147 + 21 |
| 3 | 147 | 21 | 147 = 7 · 21 + 0 |
| done | 21 | 0 | gcd = 21 |

Two small observations interviewers like:

- **Order does not matter.** If a < b, the first step computes \`a mod b = a\` and just swaps them: gcd(18, 48) takes one extra step (4 instead of 3 in example 1).
- **Subtraction works but can be terribly slow.** Euclid's original version subtracts the smaller number from the larger. For (1000000, 1) it needs 999,999 subtractions; the modulo version needs 1 step (example 2).

## 5. Why Euclid Is So Fast

After any two steps, the first number has at least halved. (If b ≤ a/2, then the next a is b, already half. If b > a/2, then a mod b = a - b < a/2, and that becomes the number two steps later.) So the number of steps is at most about 2·log2(min(a, b)): O(log min(a, b)).

The worst case is two consecutive **Fibonacci numbers**, because every quotient is 1 and the remainders shrink as slowly as possible: \`gcd(F(n+1), F(n))\` walks all the way down the Fibonacci sequence. Example 2 shows the extremes:

- \`gcd(F(45), F(44)) = gcd(1836311903, 1134903170)\` takes **44** steps, and these are the largest consecutive Fibonacci numbers that fit in a signed 32-bit int.
- The most steps for any pair below 1,000 is **14**.
- (832040, 514229), another Fibonacci pair, takes 28 steps by modulo and also 28 by subtraction, because every quotient is 1; on (1000000, 1) the gap is 999,999 to 1.

📌 **Interview term: Lamé's theorem** — the number of steps of Euclid's algorithm is at most about five times the number of decimal digits of the smaller input; the worst case is consecutive Fibonacci numbers.

## 6. The Code in Java

~~~java
static int gcd(int a, int b) {
    // Euclid: gcd(a, b) = gcd(b, a mod b) until b is 0. Counts steps in a field.
    a = Math.abs(a);
    b = Math.abs(b);
    steps = 0;
    while (b != 0) {
        int t = a % b;
        a = b;
        b = t;
        steps++;
    }
    return a;
}
~~~

The step counter (a static field, so the demo can print it) is only for the example; the interview version:

~~~java
static int gcd(int a, int b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b != 0) {
        int t = a % b;
        a = b;
        b = t;
    }
    return a;
}
~~~

The recursive form and the LCM, from example 1:

~~~java
static int gcdRecursive(int a, int b) {
    return b == 0 ? Math.abs(a) : gcdRecursive(b, a % b);
}

static long lcm(int a, int b) {
    if (a == 0 || b == 0) return 0;
    return Math.abs((long) (a / gcd(a, b)) * b); // divide first, then multiply in long
}
~~~

**What to point out in this code:**

- Java has no tuple swap, so the update needs a temporary \`t\`. Getting the order wrong (\`a = b; b = a % b;\`) is the most common bug.
- **\`%\` keeps the sign of the dividend:** \`-12 % 18\` is -12, so the \`Math.abs\` calls are needed for a non-negative result.
- **\`Math.abs(Integer.MIN_VALUE)\` is \`Integer.MIN_VALUE\`** (-2147483648 in our run), because +2147483648 does not fit in an \`int\`. If inputs can be \`MIN_VALUE\`, work in \`long\` or use \`BigInteger\`.
- **The LCM overflows \`int\` easily.** \`100000 * 99999\` wraps to 1409965408 in our run. Divide first, then cast to \`long\` before multiplying: \`(long) (a / g) * b\`.
- **The library:** there is no \`Math.gcd\`; \`BigInteger.valueOf(a).gcd(BigInteger.valueOf(b))\` is the built-in, and it returns a non-negative result. Example 1 checks it against the hand-written version.

## Verified: Running the Code

Each example was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — gcd, step count and lcm for nine pairs, checked against BigInteger.gcd, then the trace of gcd(1071, 462)** prints:

~~~text
gcd(48, 18) = 6  steps 3  lcm 144  library agrees true
gcd(18, 48) = 6  steps 4  lcm 144  library agrees true
gcd(17, 5) = 1  steps 3  lcm 85  library agrees true
gcd(100, 75) = 25  steps 2  lcm 300  library agrees true
gcd(0, 7) = 7  steps 1  lcm 0  library agrees true
gcd(7, 0) = 7  steps 0  lcm 0  library agrees true
gcd(0, 0) = 0  steps 0  lcm 0  library agrees true
gcd(-12, 18) = 6  steps 3  lcm 36  library agrees true
gcd(1071, 462) = 21  steps 3  lcm 23562  library agrees true
1071 = 2 * 462 + 147
462 = 3 * 147 + 21
147 = 7 * 21 + 0
gcd = 21
~~~

Note gcd(18, 48) takes one more step than gcd(48, 18): the first step only swaps them. gcd(0, 0) is 0 and every LCM with a zero is 0.

**Example 2 — subtraction vs modulo, the Fibonacci worst case, and how fast lcm(1..k) grows** prints:

~~~text
(48, 18): subtraction 6 in 4 steps, modulo 6 in 3 steps
(1000000, 1): subtraction 1 in 999999 steps, modulo 1 in 1 steps
(832040, 514229): subtraction 1 in 28 steps, modulo 1 in 28 steps
F(45), F(44) = 1836311903, 1134903170: modulo steps 44
most steps for any pair below 1000: 14
lcm(1..10) = 2520
lcm(1..20) = 232792560
lcm(1..30) = 2329089562800
first k that overflows int32: 23 (5354228880, wraps to 1059261584)
~~~

The running LCM is a \`long\`. The last line casts the first value past \`Integer.MAX_VALUE\` to \`int\` to show what an \`int\` loop would have produced: 1,059,261,584, with no error or exception.

## 7. Complexity

| Method | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (try every d) | O(min(a, b)) | O(1) | one division test per candidate |
| Euclid by subtraction | O(max(a, b)) worst case | O(1) | (n, 1) needs n - 1 subtractions |
| **Euclid by modulo, iterative** | **O(log min(a, b))** | **O(1)** | the larger number halves every two steps |
| Euclid by modulo, recursive | O(log min(a, b)) | O(log min(a, b)) | one stack frame per step; see [recursion and the stack](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) |
| LCM via GCD | O(log min(a, b)) | O(1) | one GCD, one division, one multiplication |
| GCD of an array of n numbers | O(n log M) | O(1) | n folds, M the largest value |

These counts treat one \`%\` as one step, which is true for fixed-size integers. For big integers (hundreds of digits) each division costs more, and binary GCD (Stein's algorithm, which uses only shifts and subtraction) is a common alternative.

## 8. Where GCD Shows Up

- **Simplifying a fraction:** divide numerator and denominator by their GCD; 48/18 becomes 8/3.
- **LCM of many numbers:** fold \`l = l / gcd(l, x) * x\`. lcm(1..20) = 232,792,560, and lcm(1..30) = 2,329,089,562,800, which does not fit in 32 bits (example 2: the first k that overflows is 23).
- **GCD of an array:** fold \`g = gcd(g, x)\`, starting from 0 (because gcd(0, x) = x).
- **Water jug problems:** with jugs of size a and b you can measure exactly the amounts that are multiples of gcd(a, b) (up to a + b).
- **Extended Euclid:** the same recursion can also produce integers x, y with \`a·x + b·y = gcd(a, b)\` (Bézout's identity), which is how modular inverses are computed.

📌 **Interview term: Bézout's identity** — for any integers a and b there are integers x and y with a·x + b·y = gcd(a, b); the extended Euclidean algorithm finds them.

## Edge Cases

- **gcd(a, 0) = |a|**: the loop body never runs and a is returned (gcd(7, 0) = 7, 0 steps).
- **gcd(0, a) = |a|**: one step swaps them (gcd(0, 7) = 7, 1 step).
- **gcd(0, 0) = 0** by convention; LCM with a zero argument is 0.
- **Negative inputs**: take absolute values first; gcd(-12, 18) = 6.
- **a < b**: works unchanged, with one extra swapping step.
- **Coprime inputs**: the answer is 1 (gcd(17, 5) = 1).
- **Huge inputs**: Euclid itself is fine, but \`a * b\` for the LCM can overflow; divide first.

## Common Pitfalls

- **\`int\` overflow in the LCM.** \`a * b / g\` wraps silently; use \`(long) (a / g) * b\`.
- **Wrong update order.** \`a = b; b = a % b;\` computes \`b % b = 0\`; save \`a % b\` in a temporary first.
- **\`Math.abs(Integer.MIN_VALUE)\`.** It stays negative; widen to \`long\` or reject that input.
- **Looking for \`Math.gcd\`.** It does not exist; write Euclid or use \`BigInteger.gcd\`.
- **Recursion without the base case.** \`a % 0\` throws \`ArithmeticException: / by zero\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">The GCD is the largest number dividing both; gcd(48, 18) = 6.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Euclid:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gcd(a, b) = gcd(b, a % b)</code> until b is 0, because (a, b) and (b, a mod b) have the same common divisors.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Java:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.abs</code> both, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">t = a % b; a = b; b = t;</code> until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b == 0</code>. No <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.gcd</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInteger.gcd</code> is the library version.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Speed:</strong> <span style="color:#f0e2c8;">O(log min(a, b)): the larger number halves every two steps; the worst case is consecutive Fibonacci numbers (44 steps for F45, F44).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. LCM:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(long) (a / gcd(a, b)) * b</code>: divide first, multiply in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>; an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> product wraps silently.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is Euclid correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Any d dividing a and b divides <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a % b</code>, and any d dividing b and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a % b</code> divides a. Both pairs have the same common divisors, so the same greatest one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What breaks with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Integer.MIN_VALUE</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.abs(Integer.MIN_VALUE)</code> is still negative, so the result can be negative. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Math.absExact</code> (Java 15+, which throws), or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInteger</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the recursive version OK in Java?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, the depth is at most about 45 for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> inputs, far below the default stack limit. The iterative version avoids the frames and is the default answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you compute the LCM of 1..30?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fold <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lcm = lcm / gcd(lcm, k) * k</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>: 2329089562800. In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> it silently wraps at k = 23, as example 2 shows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Which library methods exist?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInteger.gcd</code> for any size. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> there is no standard gcd method, so you write Euclid.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **GCD (greatest common divisor)** | Largest integer dividing both numbers |
| **Coprime** | GCD equal to 1 |
| **LCM (least common multiple)** | Smallest positive common multiple: \`abs(a) / gcd * abs(b)\` |
| **Euclidean algorithm** | Replace (a, b) by (b, a mod b) until b is 0 |
| **Lamé's theorem** | Euclid's step count is logarithmic; worst case is consecutive Fibonacci numbers |
| **Bézout's identity** | a·x + b·y = gcd(a, b) has integer solutions |

---
**Conclusion:** Euclid's algorithm replaces (a, b) with (b, a mod b) until b is 0, because both pairs share exactly the same common divisors; it needs only O(log min(a, b)) steps, with consecutive Fibonacci numbers as the worst case, and the LCM follows as \`a / gcd * b\`. In Java, write it with a temporary variable after \`Math.abs\`, compute the LCM in \`long\` after dividing, watch out for \`Integer.MIN_VALUE\`, and remember that the only built-in is \`BigInteger.gcd\`.`,
        examples: [
          {
            label: `Euclid with step counts, LCM and a trace`,
            code: `import java.math.BigInteger;

public class Main {
    static int steps;

    static int gcd(int a, int b) {
        // Euclid: gcd(a, b) = gcd(b, a mod b) until b is 0. Counts steps in a field.
        a = Math.abs(a);
        b = Math.abs(b);
        steps = 0;
        while (b != 0) {
            int t = a % b;
            a = b;
            b = t;
            steps++;
        }
        return a;
    }

    static int gcdRecursive(int a, int b) {
        return b == 0 ? Math.abs(a) : gcdRecursive(b, a % b);
    }

    static long lcm(int a, int b) {
        if (a == 0 || b == 0) return 0;
        return Math.abs((long) (a / gcd(a, b)) * b); // divide first, then multiply in long
    }

    public static void main(String[] args) {
        int[][] pairs = {{48, 18}, {18, 48}, {17, 5}, {100, 75}, {0, 7}, {7, 0}, {0, 0}, {-12, 18}, {1071, 462}};
        for (int[] p : pairs) {
            int a = p[0], b = p[1];
            int g = gcd(a, b);
            int s = steps;
            // Java has no Math.gcd; BigInteger.gcd is the library version.
            boolean ok = g == gcdRecursive(a, b) && g == BigInteger.valueOf(a).gcd(BigInteger.valueOf(b)).intValue();
            System.out.println("gcd(" + a + ", " + b + ") = " + g + "  steps " + s + "  lcm " + lcm(a, b) + "  library agrees " + ok);
        }

        // Trace Euclid on 1071 and 462.
        int a = 1071, b = 462;
        while (b != 0) {
            System.out.println(a + " = " + (a / b) + " * " + b + " + " + (a % b));
            int t = a % b;
            a = b;
            b = t;
        }
        System.out.println("gcd = " + a);
    }
}`,
          },
          {
            label: `Subtraction vs modulo, Fibonacci worst case, lcm(1..k)`,
            code: `public class Main {
    static long[] gcdSubtract(long a, long b) {
        // Euclid's original idea: subtract the smaller from the larger. Returns {gcd, steps}.
        long steps = 0;
        while (a != b) {
            if (a > b) a -= b;
            else b -= a;
            steps++;
        }
        return new long[] {a, steps};
    }

    static long[] gcdMod(long a, long b) {
        long steps = 0;
        while (b != 0) {
            long t = a % b;
            a = b;
            b = t;
            steps++;
        }
        return new long[] {a, steps};
    }

    public static void main(String[] args) {
        long[][] pairs = {{48, 18}, {1000000, 1}, {832040, 514229}};
        for (long[] p : pairs) {
            long[] s = gcdSubtract(p[0], p[1]);
            long[] m = gcdMod(p[0], p[1]);
            System.out.println("(" + p[0] + ", " + p[1] + "): subtraction " + s[0] + " in " + s[1] + " steps, modulo " + m[0] + " in " + m[1] + " steps");
        }

        long[] fib = new long[46];
        fib[0] = fib[1] = 1;
        for (int i = 2; i < 46; i++) fib[i] = fib[i - 1] + fib[i - 2];
        System.out.println("F(45), F(44) = " + fib[45] + ", " + fib[44] + ": modulo steps " + gcdMod(fib[45], fib[44])[1]);
        long most = 0;
        for (int a = 1; a < 1000; a++) for (int b = 1; b <= a; b++) most = Math.max(most, gcdMod(a, b)[1]);
        System.out.println("most steps for any pair below 1000: " + most);

        // lcm(1..k) in long; an int version would silently wrap.
        long lcm = 1;
        int firstK = 0;
        long firstValue = 0;
        for (int k = 1; k <= 30; k++) {
            lcm = lcm / gcdMod(lcm, k)[0] * k;
            if (firstK == 0 && lcm > Integer.MAX_VALUE) { firstK = k; firstValue = lcm; }
            if (k == 10 || k == 20 || k == 30) System.out.println("lcm(1.." + k + ") = " + lcm);
        }
        System.out.println("first k that overflows int32: " + firstK + " (" + firstValue + ", wraps to " + (int) firstValue + ")");
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Write a C++ function that returns the greatest common divisor of two integers. Explain why it is correct and how fast it is, and how you would compute the least common multiple safely."

**What a strong answer should cover:**
- The brute-force idea (try every divisor, O(min(a, b))) and why Euclid is better.
- Euclid's algorithm \`gcd(a, b) = gcd(b, a % b)\` with base case \`gcd(a, 0) = a\`, and why it is correct.
- O(log min(a, b)) steps, worst case consecutive Fibonacci numbers; iterative vs recursive.
- LCM as \`static_cast<long long>(a / g) * b\`: divide first, multiply in 64 bits.
- C++ details: \`std::gcd\` and \`std::lcm\` in \`<numeric>\` since C++17; \`%\` keeps the dividend's sign; signed overflow in the LCM is undefined behaviour; \`std::abs(INT_MIN)\` is undefined too.

**Clarifying questions expected:**
- Can inputs be negative or zero?
- How large can the LCM get?

**Code / implementation expected:** Yes — an iterative Euclid in C++17, then \`std::gcd\` / \`std::lcm\`.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know loops and the modulo operator in C++; the math is explained from scratch.  
**Difficulty:** Easy  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are tiling a floor that measures 48 by 18 units and you want the **biggest square tiles** that cover it exactly, with no cutting. Try 18 by 18 tiles first: two fit along the 48 side, and a strip of 12 by 18 is left over. That strip is a smaller version of the same puzzle, so tile it with 12 by 12 squares: one fits, and a 12 by 6 strip is left. Two 6 by 6 squares fill that exactly. Nothing is left over, so 6 by 6 is the largest tile that fits the whole floor.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 260" role="img" aria-label="A 48 by 18 rectangle covered by two 18 by 18 squares, one 12 by 12 square and two 6 by 6 squares">
  <text class="d-sub" x="280" y="34" text-anchor="middle">48</text>
  <text class="d-sub" x="560" y="146">18</text>
  <rect class="d-box" x="40" y="50" width="180" height="180" rx="4"/>
  <text class="d-text" x="130" y="145" text-anchor="middle">18 x 18</text>
  <rect class="d-box" x="220" y="50" width="180" height="180" rx="4"/>
  <text class="d-text" x="310" y="145" text-anchor="middle">18 x 18</text>
  <rect class="d-box-muted" x="400" y="50" width="120" height="120" rx="4"/>
  <text class="d-text" x="460" y="115" text-anchor="middle">12 x 12</text>
  <rect class="d-box-accent" x="400" y="170" width="60" height="60" rx="4"/>
  <text class="d-text" x="430" y="205" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="460" y="170" width="60" height="60" rx="4"/>
  <text class="d-text" x="490" y="205" text-anchor="middle">6</text>
</svg>

Each step cuts away the largest squares that fit and keeps only the leftover strip. The side of the last square, 6, divides every side that came before it, which is why it tiles the whole floor.

That procedure is **Euclid's algorithm**, written down in Euclid's Elements more than 2,000 years ago and still the standard way to compute the greatest common divisor. Interviewers ask about it because it is short, it has a neat correctness argument, its running time is surprisingly fast (logarithmic), and it is the building block for fractions, least common multiples, modular inverses, and problems like "can these two jugs measure exactly k litres?".

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Can the inputs be negative? | The GCD is defined as non-negative; take absolute values first, because \`%\` on negatives behaves differently across languages. |
| Can an input be 0? | \`gcd(a, 0) = abs(a)\` and, by convention, \`gcd(0, 0) = 0\`. The loop must handle both. |
| How large can the numbers get? | Euclid is fast for any size, but the LCM (\`a / gcd * b\`) can overflow 32-bit or even 64-bit integers. |
| Do you need the LCM as well? | It comes almost free: \`lcm(a, b) = abs(a) / gcd(a, b) * abs(b)\`. |
| One pair, or the GCD of a whole array? | For an array, fold: \`g = gcd(g, x)\` for each element, and stop early if g reaches 1. |
| May I use the built-in? | Some languages have one, some do not; show Euclid first either way. |

## 3. What Is the GCD?

The **greatest common divisor** of two integers is the largest integer that divides both of them with no remainder. The divisors of 48 are 1, 2, 3, 4, 6, 8, 12, 16, 24, 48; the divisors of 18 are 1, 2, 3, 6, 9, 18. The common ones are 1, 2, 3, 6, so \`gcd(48, 18) = 6\`.

📌 **Interview term: GCD (greatest common divisor)** — the largest integer that divides both a and b. Also called the greatest common factor (GCF) or highest common factor (HCF).

📌 **Interview term: Coprime** — two numbers whose GCD is 1, such as 17 and 5. A fraction a/b is in lowest terms exactly when a and b are coprime.

📌 **Interview term: LCM (least common multiple)** — the smallest positive number that both a and b divide. For non-zero a and b, \`lcm(a, b) = |a| / gcd(a, b) * |b|\`; lcm(48, 18) = 144.

**The brute force** tries every candidate from \`min(a, b)\` down to 1 and returns the first that divides both. It is correct but takes O(min(a, b)) steps: about a million for \`gcd(1000000, 999999)\`. Euclid needs a handful.

## 4. Euclid's Insight

**Any number that divides both a and b also divides a - b.** If a = 6·8 and b = 6·3, then a - b = 6·5. Subtracting b as many times as possible is the same as taking the remainder, so any common divisor of a and b also divides \`a mod b\`, and the reverse holds too. The pairs (a, b) and (b, a mod b) therefore have exactly the same common divisors, so the same GCD:

> **gcd(a, b) = gcd(b, a mod b), and gcd(a, 0) = a.**

Each step replaces the pair with a smaller one, and since the remainder is always smaller than b, the second number eventually hits 0. The first number at that moment is the answer.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 150" role="img" aria-label="Euclid on 48 and 18: gcd of 48 and 18 becomes gcd of 18 and 12, then gcd of 12 and 6, then gcd of 6 and 0, which is 6">
  <defs>
    <marker id="b33q4-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="140" height="54" rx="10"/>
  <text class="d-text" x="90" y="73" text-anchor="middle">gcd(48, 18)</text>
  <path class="d-edge" d="M 162 67 L 204 67" marker-end="url(#b33q4-a1)"/>
  <text class="d-sub" x="185" y="30" text-anchor="middle">48 mod 18</text>
  <rect class="d-box" x="210" y="40" width="140" height="54" rx="10"/>
  <text class="d-text" x="280" y="73" text-anchor="middle">gcd(18, 12)</text>
  <path class="d-edge" d="M 352 67 L 394 67" marker-end="url(#b33q4-a1)"/>
  <text class="d-sub" x="375" y="124" text-anchor="middle">18 mod 12</text>
  <rect class="d-box" x="400" y="40" width="140" height="54" rx="10"/>
  <text class="d-text" x="470" y="73" text-anchor="middle">gcd(12, 6)</text>
  <path class="d-edge" d="M 542 67 L 584 67" marker-end="url(#b33q4-a1)"/>
  <text class="d-sub" x="565" y="30" text-anchor="middle">12 mod 6</text>
  <rect class="d-box-accent" x="590" y="40" width="140" height="54" rx="10"/>
  <text class="d-text" x="660" y="73" text-anchor="middle">gcd(6, 0) = 6</text>
</svg>

Three remainder steps take (48, 18) to (6, 0). The tiling picture in section 1 is the same computation: each "cut away the biggest squares" is one \`mod\`.

📌 **Interview term: Euclidean algorithm** — compute gcd(a, b) by repeatedly replacing (a, b) with (b, a mod b) until b is 0; the remaining a is the GCD.

A trace on a larger pair, as printed by example 1:

| Step | a | b | a = q · b + r |
| :--- | :--- | :--- | :--- |
| 1 | 1071 | 462 | 1071 = 2 · 462 + 147 |
| 2 | 462 | 147 | 462 = 3 · 147 + 21 |
| 3 | 147 | 21 | 147 = 7 · 21 + 0 |
| done | 21 | 0 | gcd = 21 |

Two small observations interviewers like:

- **Order does not matter.** If a < b, the first step computes \`a mod b = a\` and just swaps them: gcd(18, 48) takes one extra step (4 instead of 3 in example 1).
- **Subtraction works but can be terribly slow.** Euclid's original version subtracts the smaller number from the larger. For (1000000, 1) it needs 999,999 subtractions; the modulo version needs 1 step (example 2).

## 5. Why Euclid Is So Fast

After any two steps, the first number has at least halved. (If b ≤ a/2, then the next a is b, already half. If b > a/2, then a mod b = a - b < a/2, and that becomes the number two steps later.) So the number of steps is at most about 2·log2(min(a, b)): O(log min(a, b)).

The worst case is two consecutive **Fibonacci numbers**, because every quotient is 1 and the remainders shrink as slowly as possible: \`gcd(F(n+1), F(n))\` walks all the way down the Fibonacci sequence. Example 2 shows the extremes:

- \`gcd(F(45), F(44)) = gcd(1836311903, 1134903170)\` takes **44** steps, and these are the largest consecutive Fibonacci numbers that fit in a signed 32-bit int.
- The most steps for any pair below 1,000 is **14**.
- (832040, 514229), another Fibonacci pair, takes 28 steps by modulo and also 28 by subtraction, because every quotient is 1; on (1000000, 1) the gap is 999,999 to 1.

📌 **Interview term: Lamé's theorem** — the number of steps of Euclid's algorithm is at most about five times the number of decimal digits of the smaller input; the worst case is consecutive Fibonacci numbers.

## 6. The Code in C++

~~~cpp
int gcd(int a, int b, int& steps) {
    // Euclid: gcd(a, b) = gcd(b, a mod b) until b is 0.
    a = std::abs(a);
    b = std::abs(b);
    steps = 0;
    while (b != 0) {
        a = std::exchange(b, a % b);  // b becomes a % b, a gets the old b
        steps++;
    }
    return a;
}
~~~

The step counter is only for the demo; the interview version:

~~~cpp
int gcd(int a, int b) {
    a = std::abs(a);
    b = std::abs(b);
    while (b != 0) {
        int t = a % b;
        a = b;
        b = t;
    }
    return a;
}
~~~

The recursive form and the LCM, from example 1:

~~~cpp
int gcdRecursive(int a, int b) { return b == 0 ? std::abs(a) : gcdRecursive(b, a % b); }

long long lcm(int a, int b) {
    if (a == 0 || b == 0) return 0;
    int s;
    return std::llabs(static_cast<long long>(a / gcd(a, b, s)) * b);  // divide first, multiply in 64 bits
}
~~~

**What to point out in this code:**

- \`a = std::exchange(b, a % b)\` (from \`<utility>\`, C++14) sets \`b\` to \`a % b\` and returns the old \`b\` into \`a\`: a one-line simultaneous update. The temporary-variable form is equally good.
- **\`%\` keeps the sign of the dividend** (\`-12 % 18\` is -12), so take \`std::abs\` first. \`std::abs(INT_MIN)\` cannot be represented and is undefined behaviour; widen to \`long long\` if that input is possible.
- **The LCM overflows \`int\` easily**, and signed overflow is undefined behaviour rather than a predictable wrap. Divide first, then multiply in \`long long\`.
- **The library (C++17):** \`std::gcd\` and \`std::lcm\` in \`<numeric>\` ([cppreference: std::gcd](https://en.cppreference.com/w/cpp/numeric/gcd)). \`std::gcd\` works on absolute values, returns 0 when both are 0, and is undefined if \`|m|\` or \`|n|\` is not representable in the common type; \`std::lcm\` is likewise undefined if the result does not fit, so call it with \`long long\` arguments when the result may be large. Example 1 checks both against the hand-written code. Older code sometimes uses \`__gcd\`, a GCC library extension; prefer \`std::gcd\`.

## Verified: Running the Code

Each example was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — gcd, step count and lcm for nine pairs, checked against std::gcd and std::lcm, then the trace of gcd(1071, 462)** prints:

~~~text
gcd(48, 18) = 6  steps 3  lcm 144  library agrees true
gcd(18, 48) = 6  steps 4  lcm 144  library agrees true
gcd(17, 5) = 1  steps 3  lcm 85  library agrees true
gcd(100, 75) = 25  steps 2  lcm 300  library agrees true
gcd(0, 7) = 7  steps 1  lcm 0  library agrees true
gcd(7, 0) = 7  steps 0  lcm 0  library agrees true
gcd(0, 0) = 0  steps 0  lcm 0  library agrees true
gcd(-12, 18) = 6  steps 3  lcm 36  library agrees true
gcd(1071, 462) = 21  steps 3  lcm 23562  library agrees true
1071 = 2 * 462 + 147
462 = 3 * 147 + 21
147 = 7 * 21 + 0
gcd = 21
~~~

Note gcd(18, 48) takes one more step than gcd(48, 18): the first step only swaps them. gcd(0, 0) is 0, matching \`std::gcd\`.

**Example 2 — subtraction vs modulo, the Fibonacci worst case, and how fast lcm(1..k) grows** prints:

~~~text
(48, 18): subtraction 6 in 4 steps, modulo 6 in 3 steps
(1000000, 1): subtraction 1 in 999999 steps, modulo 1 in 1 steps
(832040, 514229): subtraction 1 in 28 steps, modulo 1 in 28 steps
F(45), F(44) = 1836311903, 1134903170: modulo steps 44
most steps for any pair below 1000: 14
lcm(1..10) = 2520
lcm(1..20) = 232792560
lcm(1..30) = 2329089562800
first k that overflows int32: 23 (5354228880, wraps to 1059261584)
~~~

The running LCM uses \`std::lcm\` on \`long long\`. The last line converts through \`uint32_t\` to show what 32 bits would hold, 1,059,261,584, without triggering signed overflow.

## 7. Complexity

| Method | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Brute force (try every d) | O(min(a, b)) | O(1) | one division test per candidate |
| Euclid by subtraction | O(max(a, b)) worst case | O(1) | (n, 1) needs n - 1 subtractions |
| **Euclid by modulo, iterative** | **O(log min(a, b))** | **O(1)** | the larger number halves every two steps |
| Euclid by modulo, recursive | O(log min(a, b)) | O(log min(a, b)) | one stack frame per step; see [recursion and the stack](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) |
| LCM via GCD | O(log min(a, b)) | O(1) | one GCD, one division, one multiplication |
| GCD of an array of n numbers | O(n log M) | O(1) | n folds, M the largest value |

These counts treat one \`%\` as one step, which is true for fixed-size integers. For big integers (hundreds of digits) each division costs more, and binary GCD (Stein's algorithm, which uses only shifts and subtraction) is a common alternative.

## 8. Where GCD Shows Up

- **Simplifying a fraction:** divide numerator and denominator by their GCD; 48/18 becomes 8/3.
- **LCM of many numbers:** fold \`l = l / gcd(l, x) * x\`. lcm(1..20) = 232,792,560, and lcm(1..30) = 2,329,089,562,800, which does not fit in 32 bits (example 2: the first k that overflows is 23).
- **GCD of an array:** fold \`g = gcd(g, x)\`, starting from 0 (because gcd(0, x) = x).
- **Water jug problems:** with jugs of size a and b you can measure exactly the amounts that are multiples of gcd(a, b) (up to a + b).
- **Extended Euclid:** the same recursion can also produce integers x, y with \`a·x + b·y = gcd(a, b)\` (Bézout's identity), which is how modular inverses are computed.

📌 **Interview term: Bézout's identity** — for any integers a and b there are integers x and y with a·x + b·y = gcd(a, b); the extended Euclidean algorithm finds them.

## Edge Cases

- **gcd(a, 0) = |a|**: the loop body never runs and a is returned (gcd(7, 0) = 7, 0 steps).
- **gcd(0, a) = |a|**: one step swaps them (gcd(0, 7) = 7, 1 step).
- **gcd(0, 0) = 0** by convention; LCM with a zero argument is 0.
- **Negative inputs**: take absolute values first; gcd(-12, 18) = 6.
- **a < b**: works unchanged, with one extra swapping step.
- **Coprime inputs**: the answer is 1 (gcd(17, 5) = 1).
- **Huge inputs**: Euclid itself is fine, but \`a * b\` for the LCM can overflow; divide first.

## Common Pitfalls

- **Signed overflow in the LCM.** \`a * b / g\` in \`int\` is undefined behaviour; use \`static_cast<long long>(a / g) * b\`.
- **\`std::lcm\` on \`int\` with a large result.** Undefined if the result does not fit; pass \`long long\`.
- **\`std::abs(INT_MIN)\`.** Undefined; widen first if that input can occur.
- **Wrong update order.** \`a = b; b = a % b;\` computes \`b % b\`; use a temporary or \`std::exchange\`.
- **Including the wrong header.** \`std::gcd\` and \`std::lcm\` live in \`<numeric>\`, not \`<algorithm>\` or \`<cmath>\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">The GCD is the largest number dividing both; gcd(48, 18) = 6.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Euclid:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gcd(a, b) = gcd(b, a % b)</code> until b is 0, because (a, b) and (b, a mod b) have the same common divisors.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. C++:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::abs</code> both, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a = std::exchange(b, a % b)</code> until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b == 0</code>; in production <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::gcd</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;numeric&gt;</code> (C++17).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Speed:</strong> <span style="color:#f0e2c8;">O(log min(a, b)): the larger number halves every two steps; the worst case is consecutive Fibonacci numbers (44 steps for F45, F44).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. LCM:</strong> <span style="color:#f0e2c8;">Divide first and multiply in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::lcm</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> arguments; signed overflow is undefined behaviour.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is Euclid correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Any d dividing a and b divides <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a % b</code>, and any d dividing b and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a % b</code> divides a. Both pairs have the same common divisors, so the same greatest one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::gcd</code> do with negatives and zeros?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It works on absolute values, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::gcd(-12, 18)</code> is 6, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::gcd(0, 0)</code> is 0. It is undefined if an absolute value cannot be represented, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INT_MIN</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is overflow worse in C++ than in Java?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In Java an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> overflow wraps predictably. In C++ signed overflow is undefined behaviour, so the optimiser may assume it never happens and the program can misbehave in surprising ways.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you compute the LCM of 1..30?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fold <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::lcm</code> over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>: 2329089562800. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> it would overflow at k = 23.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Recursive or iterative?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both are O(log n) steps; recursion uses O(log n) stack frames (about 45 at most for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>). The iterative loop is the default.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **GCD (greatest common divisor)** | Largest integer dividing both numbers |
| **Coprime** | GCD equal to 1 |
| **LCM (least common multiple)** | Smallest positive common multiple: \`abs(a) / gcd * abs(b)\` |
| **Euclidean algorithm** | Replace (a, b) by (b, a mod b) until b is 0 |
| **Lamé's theorem** | Euclid's step count is logarithmic; worst case is consecutive Fibonacci numbers |
| **Bézout's identity** | a·x + b·y = gcd(a, b) has integer solutions |

---
**Conclusion:** Euclid's algorithm replaces (a, b) with (b, a mod b) until b is 0, because both pairs share exactly the same common divisors; it needs only O(log min(a, b)) steps, with consecutive Fibonacci numbers as the worst case, and the LCM follows as \`a / gcd * b\`. In C++17, \`std::gcd\` and \`std::lcm\` from \`<numeric>\` are the production answer; when you write it yourself, take absolute values, divide before multiplying, and keep the LCM in \`long long\`, because signed overflow is undefined behaviour, not a wrap.`,
        examples: [
          {
            label: `Euclid with step counts, LCM and a trace`,
            code: `#include <cstdlib>
#include <iostream>
#include <numeric>
#include <utility>

int gcd(int a, int b, int& steps) {
    // Euclid: gcd(a, b) = gcd(b, a mod b) until b is 0.
    a = std::abs(a);
    b = std::abs(b);
    steps = 0;
    while (b != 0) {
        a = std::exchange(b, a % b);  // b becomes a % b, a gets the old b
        steps++;
    }
    return a;
}

int gcdRecursive(int a, int b) { return b == 0 ? std::abs(a) : gcdRecursive(b, a % b); }

long long lcm(int a, int b) {
    if (a == 0 || b == 0) return 0;
    int s;
    return std::llabs(static_cast<long long>(a / gcd(a, b, s)) * b);  // divide first, multiply in 64 bits
}

int main() {
    std::cout << std::boolalpha;
    int pairs[][2] = {{48, 18}, {18, 48}, {17, 5}, {100, 75}, {0, 7}, {7, 0}, {0, 0}, {-12, 18}, {1071, 462}};
    for (auto& p : pairs) {
        int a = p[0], b = p[1], steps;
        int g = gcd(a, b, steps);
        bool ok = g == gcdRecursive(a, b) && g == std::gcd(a, b) && lcm(a, b) == std::lcm(static_cast<long long>(a), b);
        std::cout << "gcd(" << a << ", " << b << ") = " << g << "  steps " << steps << "  lcm " << lcm(a, b)
                  << "  library agrees " << ok << "\\n";
    }

    // Trace Euclid on 1071 and 462.
    int a = 1071, b = 462;
    while (b != 0) {
        std::cout << a << " = " << a / b << " * " << b << " + " << a % b << "\\n";
        a = std::exchange(b, a % b);
    }
    std::cout << "gcd = " << a << "\\n";
}`,
          },
          {
            label: `Subtraction vs modulo, Fibonacci worst case, lcm(1..k)`,
            code: `#include <algorithm>
#include <cstdint>
#include <iostream>
#include <numeric>
#include <utility>

std::pair<long long, long long> gcdSubtract(long long a, long long b) {
    // Euclid's original idea: subtract the smaller from the larger.
    long long steps = 0;
    while (a != b) {
        if (a > b) a -= b;
        else b -= a;
        steps++;
    }
    return {a, steps};
}

std::pair<long long, long long> gcdMod(long long a, long long b) {
    long long steps = 0;
    while (b != 0) {
        a = std::exchange(b, a % b);
        steps++;
    }
    return {a, steps};
}

int main() {
    long long pairs[][2] = {{48, 18}, {1000000, 1}, {832040, 514229}};
    for (auto& p : pairs) {
        auto [gs, ss] = gcdSubtract(p[0], p[1]);
        auto [gm, sm] = gcdMod(p[0], p[1]);
        std::cout << "(" << p[0] << ", " << p[1] << "): subtraction " << gs << " in " << ss << " steps, modulo " << gm
                  << " in " << sm << " steps\\n";
    }

    long long fib[46] = {1, 1};
    for (int i = 2; i < 46; i++) fib[i] = fib[i - 1] + fib[i - 2];
    std::cout << "F(45), F(44) = " << fib[45] << ", " << fib[44] << ": modulo steps " << gcdMod(fib[45], fib[44]).second << "\\n";
    long long most = 0;
    for (int a = 1; a < 1000; a++)
        for (int b = 1; b <= a; b++) most = std::max(most, gcdMod(a, b).second);
    std::cout << "most steps for any pair below 1000: " << most << "\\n";

    // lcm(1..k) in 64 bits; std::lcm on int would overflow (undefined behaviour) instead.
    long long lcm = 1, firstValue = 0;
    int firstK = 0;
    for (int k = 1; k <= 30; k++) {
        lcm = std::lcm(lcm, static_cast<long long>(k));
        if (firstK == 0 && lcm > INT32_MAX) { firstK = k; firstValue = lcm; }
        if (k == 10 || k == 20 || k == 30) std::cout << "lcm(1.." << k << ") = " << lcm << "\\n";
    }
    int32_t wrapped = static_cast<int32_t>(static_cast<uint32_t>(firstValue));  // what 32-bit math would hold
    std::cout << "first k that overflows int32: " << firstK << " (" << firstValue << ", wraps to " << wrapped << ")\\n";
}`,
          },
        ],
      },
    },
  },
  {
    title: `How does the Sieve of Eratosthenes work?`,
    difficulty: "medium",
    seoDescription: `How the Sieve of Eratosthenes finds all primes up to n in O(n log log n): start at p squared, stop at the square root, plus SPF and segmented sieves.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Explain how the Sieve of Eratosthenes finds all primes up to n, then implement it in Python. Why does the inner loop start at p squared, and what is the time complexity?"

**What a strong answer should cover:**
- The idea: mark every number as candidate prime, and for each prime p cross out its multiples; survivors are prime.
- The two optimisations: start at p² (smaller multiples were crossed by smaller primes) and stop once p² > n.
- O(n log log n) time vs O(n√n) for trial division on every number; O(n) space.
- Variations: smallest-prime-factor sieve for factorisation, segmented sieve for a window [L, R].
- Python details: use a \`bytearray\` (1 byte per flag) rather than a list of bools (an 8-byte reference per flag), and slice assignment \`flags[p*p::p] = bytes(k)\` so the crossing loop runs in C; \`math.isqrt\` for an exact square root.

**Clarifying questions expected:**
- Is n inclusive, and how large can it be?
- Do you need the list, the count, or fast lookups?

**Code / implementation expected:** Yes — a sieve in Python 3 returning the primes (or the count) up to n.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know arrays and loops in Python; primes and the math are explained from scratch.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A teacher writes the numbers 2 to 100 on the board and gives the class one rule: "Circle the smallest number that is not crossed out, then cross out every multiple of it. Repeat." The first circle goes round 2, and 4, 6, 8, ... disappear. Then 3 is circled and 6, 9, 12, ... go. 4 is already crossed out, so the next circle is 5. After a few rounds, everything still standing is a prime, and nobody ever divided anything.

That classroom game is the **Sieve of Eratosthenes**, named after the Greek scholar who described it more than 2,000 years ago. It finds *all* primes up to n at once, and it does so by crossing out instead of testing, which is dramatically less work than checking each number on its own.

Interviewers ask about it because it is the standard answer to "count the primes below n" or "precompute primes for many queries", because the two small optimisations (start at p², stop at √n) test whether you understand *why* it works, and because its running time, O(n log log n), is one of the few non-obvious complexities you are expected to know.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How large is n? | The sieve needs one flag per number: 10^7 flags is about 10 MB as bytes, fine; 10^10 is not, which calls for a segmented sieve. |
| Do you want the list of primes, the count, or fast "is x prime?" lookups? | All three come from the same flag array, but the output format changes the memory you keep. |
| Is n included? ("primes up to n" vs "less than n") | An off-by-one here is the most common wrong answer. |
| Is it one number or many? | To test one number, trial division up to √x is enough; the sieve pays off when you need many primes or many queries. |
| Do you need factorisations too? | A smallest-prime-factor sieve gives every factorisation up to n in O(log x) each (section 8). |
| Is the range far from zero, like [10^9, 10^9 + 100]? | Then sieve only that window with the primes up to √R (segmented sieve). |

## 3. Primes and the Slow Way

A **prime** is a whole number greater than 1 whose only divisors are 1 and itself: 2, 3, 5, 7, 11, ... A number greater than 1 that is not prime is **composite**; 1 is neither.

📌 **Interview term: Prime / composite** — a prime has exactly two divisors, 1 and itself; a composite number (greater than 1) has more. 0 and 1 are neither.

The obvious test checks one number at a time: try dividing x by 2, 3, 4, ... and stop at √x, because if x = a · b with a ≤ b, then a ≤ √x. Doing that for every number up to n costs up to √n divisions per number, about O(n√n) in total. For n = 100,000, example 1 counts **2,745,694** divisions.

📌 **Interview term: Trial division** — testing whether x is prime by dividing it by every candidate from 2 up to √x. O(√x) for one number.

## 4. The Sieve

Instead of asking "does anything divide x?" for every x, the sieve turns the question around: "for each prime p, which numbers does p divide?" Those are just p's multiples, and you can walk them with a step of p, no division needed.

1. Make a list of flags \`is_prime[0..n]\`, all true except 0 and 1.
2. For p = 2, 3, 4, ...: if \`is_prime[p]\` is still true, p is prime; set \`is_prime[m] = false\` for every multiple m of p.
3. Whatever is still true at the end is prime.

The board for n = 30 after sieving:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="The numbers 1 to 30 after sieving: 2 3 5 7 11 13 17 19 23 29 remain as primes and every other number from 4 up is crossed out">
  <rect class="d-box" x="20" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="50" y="52" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="88" y="20" width="60" height="52" rx="8"/>
  <text class="d-text" x="118" y="52" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="156" y="20" width="60" height="52" rx="8"/>
  <text class="d-text" x="186" y="52" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="224" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="254" y="52" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="292" y="20" width="60" height="52" rx="8"/>
  <text class="d-text" x="322" y="52" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="360" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="390" y="52" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="428" y="20" width="60" height="52" rx="8"/>
  <text class="d-text" x="458" y="52" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="496" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="526" y="52" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="564" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="594" y="52" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="632" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="662" y="52" text-anchor="middle">10</text>
  <rect class="d-box-accent" x="20" y="92" width="60" height="52" rx="8"/>
  <text class="d-text" x="50" y="124" text-anchor="middle">11</text>
  <rect class="d-box-muted" x="88" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="118" y="124" text-anchor="middle">12</text>
  <rect class="d-box-accent" x="156" y="92" width="60" height="52" rx="8"/>
  <text class="d-text" x="186" y="124" text-anchor="middle">13</text>
  <rect class="d-box-muted" x="224" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="254" y="124" text-anchor="middle">14</text>
  <rect class="d-box-muted" x="292" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="322" y="124" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="360" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="390" y="124" text-anchor="middle">16</text>
  <rect class="d-box-accent" x="428" y="92" width="60" height="52" rx="8"/>
  <text class="d-text" x="458" y="124" text-anchor="middle">17</text>
  <rect class="d-box-muted" x="496" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="526" y="124" text-anchor="middle">18</text>
  <rect class="d-box-accent" x="564" y="92" width="60" height="52" rx="8"/>
  <text class="d-text" x="594" y="124" text-anchor="middle">19</text>
  <rect class="d-box-muted" x="632" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="662" y="124" text-anchor="middle">20</text>
  <rect class="d-box-muted" x="20" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="50" y="196" text-anchor="middle">21</text>
  <rect class="d-box-muted" x="88" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="118" y="196" text-anchor="middle">22</text>
  <rect class="d-box-accent" x="156" y="164" width="60" height="52" rx="8"/>
  <text class="d-text" x="186" y="196" text-anchor="middle">23</text>
  <rect class="d-box-muted" x="224" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="254" y="196" text-anchor="middle">24</text>
  <rect class="d-box-muted" x="292" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="322" y="196" text-anchor="middle">25</text>
  <rect class="d-box-muted" x="360" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="390" y="196" text-anchor="middle">26</text>
  <rect class="d-box-muted" x="428" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="458" y="196" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="496" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="526" y="196" text-anchor="middle">28</text>
  <rect class="d-box-accent" x="564" y="164" width="60" height="52" rx="8"/>
  <text class="d-text" x="594" y="196" text-anchor="middle">29</text>
  <rect class="d-box-muted" x="632" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="662" y="196" text-anchor="middle">30</text>
</svg>

The highlighted cells (2, 3, 5, 7, 11, 13, 17, 19, 23, 29) were never crossed out; the faded ones were crossed out as a multiple of some smaller prime. Only 2, 3 and 5 actually had to sieve, as the second optimisation below explains.

📌 **Interview term: Sieve of Eratosthenes** — find all primes up to n by crossing out the multiples of each prime in turn; the numbers never crossed out are prime.

### Optimisation 1: start crossing at p²

Every multiple of p smaller than p² is \`k · p\` with k < p, so it has a smaller prime factor and was already crossed out in an earlier round. The first multiple that is new is p · p.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 160" role="img" aria-label="Multiples of 5 up to 30: 10 and 20 and 30 were crossed by 2, 15 by 3, and 25 is the first one 5 has to cross itself">
  <rect class="d-box-muted" x="20" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="75" y="64" text-anchor="middle">10</text>
  <text class="d-sub" x="75" y="90" text-anchor="middle">done by 2</text>
  <rect class="d-box-muted" x="160" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="215" y="64" text-anchor="middle">15</text>
  <text class="d-sub" x="215" y="90" text-anchor="middle">done by 3</text>
  <rect class="d-box-muted" x="300" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="355" y="64" text-anchor="middle">20</text>
  <text class="d-sub" x="355" y="90" text-anchor="middle">done by 2</text>
  <rect class="d-box-accent" x="440" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="495" y="64" text-anchor="middle">25 = 5 x 5</text>
  <text class="d-sub" x="495" y="90" text-anchor="middle">first new one</text>
  <rect class="d-box-muted" x="580" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="635" y="64" text-anchor="middle">30</text>
  <text class="d-sub" x="635" y="90" text-anchor="middle">done by 2</text>
</svg>

When it is 5's turn, every multiple of 5 below 25 has a factor 2 or 3 and is already gone, so the inner loop starts at 25. (30 is crossed again, harmlessly: the sieve does cross some numbers more than once.)

### Optimisation 2: stop when p² > n

If p² > n, then p has nothing new to cross out (its first new multiple is beyond n). So the outer loop only runs while \`p * p <= n\`. For n = 30 only 2, 3 and 5 sieve; 7 · 7 = 49 is already past 30.

How much do they save? For n = 100,000, example 1 counts **193,078** crossings when each prime starts at p², against **202,154** when it starts at 2p. The bigger saving comes from the stopping rule, which skips all primes above √n = 316 entirely.

📌 **Interview term: p² start / √n stop** — the two standard sieve optimisations: begin crossing out at p·p, and stop the outer loop once p·p > n.

## 5. Why It Is O(n log log n)

Prime p crosses out about n / p numbers. The total work is

> n/2 + n/3 + n/5 + n/7 + ... (over primes up to √n)

and the sum of 1/p over primes up to x grows like **ln ln x**, a function that grows unbelievably slowly (ln ln 10^9 is about 3). So the sieve does O(n log log n) work in total, which for practical purposes is linear. Compare the measured counts for n = 100,000: 193,078 crossings, roughly 1.9 per number, against 2,745,694 trial divisions.

📌 **Interview term: O(n log log n)** — the running time of the sieve: n times the sum of 1/p over primes, which grows like log log n. Almost linear in practice.

The space is one flag per number, O(n). That, not time, is usually the limit: the next sections show how each language stores the flags compactly, and section 8 shows the segmented sieve that needs only O(√n) memory. See [space complexity](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) for how to talk about that trade-off, and [Big-O notation](/interview-question/what-is-big-o-notation) for the notation itself.

## 6. The Code in Python

~~~python
def sieve(n):
    """is_prime[i] is 1 when i is prime, for 0 <= i <= n. Returns (flags, crossings)."""
    is_prime = bytearray([1]) * (n + 1)
    is_prime[0] = 0  # 0 and 1 are not prime
    if n >= 1:
        is_prime[1] = 0
    crossings = 0
    p = 2
    while p * p <= n:  # a composite <= n always has a prime factor <= sqrt(n)
        if is_prime[p]:
            # start at p*p: smaller multiples of p were crossed out by smaller primes
            count = len(range(p * p, n + 1, p))
            is_prime[p * p :: p] = bytes(count)  # slice assignment: the loop runs in C
            crossings += count
        p += 1
    return is_prime, crossings
~~~

The \`crossings\` counter is only there for the comparison in example 1. Without it, the heart of the Python version is three lines:

~~~python
for p in range(2, math.isqrt(n) + 1):
    if is_prime[p]:
        is_prime[p * p :: p] = bytes(len(range(p * p, n + 1, p)))
~~~

**What to point out in this code:**

- **\`bytearray\` instead of a list.** A \`bytearray\` stores one byte per flag. A \`list\` of \`True\`/\`False\` stores a pointer per entry (8 bytes on a 64-bit build), so it needs several times more memory for the same n.
- **Slice assignment does the crossing in C.** \`is_prime[p*p::p] = bytes(count)\` writes zeros to every p-th position in one statement; the right side must have exactly as many bytes as the slice has positions, which \`len(range(p*p, n+1, p))\` computes without building a list. A plain \`for m in range(p*p, n+1, p)\` loop gives the same result (the \`sieve_from_2p\` helper in example 1 is written that way) but runs bytecode per crossing.
- **\`math.isqrt(n)\`** returns the exact integer square root, so \`range(2, math.isqrt(n) + 1)\` is the √n stopping rule with no floating-point rounding risk.
- \`sum(flags)\` counts the primes, because each flag is 0 or 1.
- Python ints never overflow, so \`p * p\` is safe for any n.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — primes up to 50, π(n) for n = 10 to 10^6, and the work compared with trial division** prints:

~~~text
primes up to 50: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]
pi(10) = 4
pi(100) = 25
pi(1000) = 168
pi(10000) = 1229
pi(100000) = 9592
pi(1000000) = 78498
n = 100000: 9592 primes
sieve crossings from p*p: 193078
sieve crossings from 2p:  202154
trial division: 9592 primes, 2745694 divisions
~~~

π(n) is the usual name for the number of primes up to n; 78,498 primes up to a million is the well-known value. The sieve's 193,078 crossings against 2,745,694 trial divisions is the n log log n vs n√n gap.

**Example 2 — smallest-prime-factor factorisation and a segmented sieve on [10^9, 10^9 + 100]** prints:

~~~text
84 = 2 * 2 * 3 * 7
97 = 97
360 = 2 * 2 * 2 * 3 * 3 * 5
1001 = 7 * 11 * 13
9973 = 9973
8192 = 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2
base primes up to 31622: 3401
primes in [1000000000, 1000000100]: 7
first 1000000007, last 1000000097
agrees with trial division: true
~~~

The segmented sieve only allocated 101 flags for the window plus 31,623 for the base primes, instead of a billion.

## 8. Two Variations Worth Knowing

**Smallest-prime-factor (SPF) sieve.** Instead of a true/false flag, store for every number its smallest prime factor: initialise \`spf[i] = i\`, and when prime p crosses out m, set \`spf[m] = p\` if it is still \`m\`. Then any x ≤ n factorises by repeated division, \`x = spf[x] · (x / spf[x])\`, in O(log x) steps, because every step at least halves x. Example 2 factorises 360 as 2 · 2 · 2 · 3 · 3 · 5 this way.

📌 **Interview term: Smallest prime factor (SPF) sieve** — a sieve that records the smallest prime factor of every number up to n, so any of them can be factorised in O(log x).

**Segmented sieve.** To find primes in a window [L, R] far from zero (example 2 uses [1,000,000,000, 1,000,000,100]), first sieve the small primes up to √R (3,401 primes up to 31,622), then cross out their multiples inside the window only, starting at the first multiple ≥ L (and never below p²). Memory is O(√R + (R - L)) instead of O(R). The window holds 7 primes, from 1,000,000,007 to 1,000,000,097, and example 2 confirms them against trial division.

📌 **Interview term: Segmented sieve** — sieving a window [L, R] using only the primes up to √R, so memory is proportional to the window and √R rather than to R.

There is also a **linear sieve** that crosses out each composite exactly once (O(n) time), useful when you need the SPF array anyway; in interviews, the classic sieve is the expected answer.

## 9. Complexity

| Method | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Trial division, one number x | O(√x) | O(1) | divisors up to √x |
| Trial division, every number up to n | O(n√n) | O(1) | √x per number |
| **Sieve of Eratosthenes** | **O(n log log n)** | **O(n)** | n/p crossings per prime p ≤ √n |
| SPF sieve + factorise one x | O(n log log n) once, then O(log x) | O(n) | each division at least halves x |
| Segmented sieve on [L, R] | O((R - L) log log R + √R log log √R) | O(√R + R - L) | base primes, then the window |

The flag array is the real cost: n bytes as a byte array, or n/8 bytes if each flag is a single bit.

## Edge Cases

- **n < 2:** there are no primes; the code must not write \`is_prime[1]\` when the array has only one element (n = 0).
- **n = 2:** the outer loop does not run (2 · 2 > 2); the answer is [2].
- **n itself prime:** "up to n" includes n, so the array has n + 1 entries.
- **Perfect squares:** n = 25 must cross out 25, so the condition is \`p * p <= n\`, not \`<\`.
- **Overflow of p · p:** for n near the 32-bit limit, \`p * p\` overflows a 32-bit int; compute it in 64 bits.
- **Large n:** memory runs out before time does; use bits or a segmented sieve.

## Common Pitfalls

- **Off-by-one on n.** \`bytearray(n)\` has indices 0..n-1, so n itself is never tested; allocate \`n + 1\`.
- **\`int(n ** 0.5)\` for the bound.** Floating-point rounding can be off by one for large n; use \`math.isqrt\`.
- **A list of bools for large n.** It uses several times the memory of a \`bytearray\`; at 10^8 the difference is hundreds of megabytes.
- **Mismatched slice length.** \`flags[p*p::p] = bytes(n // p)\` raises \`ValueError\` because the lengths differ; compute the exact count.
- **Testing each number with a function call.** \`[x for x in range(n) if is_prime(x)]\` is trial division, O(n√n), not a sieve.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">Flags for 0..n, all true except 0 and 1; for each p still true, cross out its multiples; survivors are prime.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Start at p²:</strong> <span style="color:#f0e2c8;">Multiples below p·p have a smaller prime factor, so they are already crossed out.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Stop at √n:</strong> <span style="color:#f0e2c8;">Loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for p in range(2, math.isqrt(n) + 1)</code>: a prime above √n has nothing new to cross out.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n log log n) time (sum of n/p over primes), O(n) space; 193,078 crossings vs 2,745,694 trial divisions at n = 100,000.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bytearray</code> for one byte per flag, and slice assignment <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">flags[p*p::p] = bytes(k)</code> so the inner loop runs in C.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it n log log n and not n log n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prime p crosses about n/p numbers, and the sum of 1/p over primes up to x grows like log log x, not log x, because primes thin out.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you factorise many numbers quickly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A smallest-prime-factor sieve: store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">spf[i]</code>, then divide by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">spf[x]</code> repeatedly, O(log x) per number.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if n is 10^10?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The flags do not fit in memory. Use a segmented sieve: base primes up to √n, then sieve blocks of, say, a million numbers at a time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">bytearray</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[True] * (n + 1)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A list stores an 8-byte reference per entry; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bytearray</code> stores one byte, and it supports fast slice assignment.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test a single large number?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with a sieve. Trial division up to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">math.isqrt(x)</code> is O(√x); for very large x, a probabilistic test such as Miller-Rabin.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prime / composite** | Exactly two divisors / more than two (0 and 1 are neither) |
| **Trial division** | Divide by every candidate up to √x |
| **Sieve of Eratosthenes** | Cross out multiples of each prime; survivors are prime |
| **p² start / √n stop** | Start crossing at p·p; stop when p·p > n |
| **O(n log log n)** | The sieve's running time, almost linear |
| **Smallest prime factor (SPF) sieve** | Store each number's smallest prime factor for fast factorisation |
| **Segmented sieve** | Sieve a window [L, R] with the primes up to √R |

---
**Conclusion:** The Sieve of Eratosthenes finds every prime up to n by crossing out the multiples of each prime instead of testing numbers one at a time; starting at p² and stopping at √n keep it at O(n log log n) time and O(n) space, against O(n√n) for trial division. In Python, store the flags in a \`bytearray\`, cross out with slice assignment so the work runs in C, and use \`math.isqrt\` for the bound; for factorisations reach for the SPF sieve, and for huge ranges the segmented sieve.`,
        examples: [
          {
            label: `Sieve up to n: primes, prime counts and work vs trial division`,
            code: `import math


def sieve(n):
    """is_prime[i] is 1 when i is prime, for 0 <= i <= n. Returns (flags, crossings)."""
    is_prime = bytearray([1]) * (n + 1)
    is_prime[0] = 0  # 0 and 1 are not prime
    if n >= 1:
        is_prime[1] = 0
    crossings = 0
    p = 2
    while p * p <= n:  # a composite <= n always has a prime factor <= sqrt(n)
        if is_prime[p]:
            # start at p*p: smaller multiples of p were crossed out by smaller primes
            count = len(range(p * p, n + 1, p))
            is_prime[p * p :: p] = bytes(count)  # slice assignment: the loop runs in C
            crossings += count
        p += 1
    return is_prime, crossings


def sieve_from_2p(n):
    """The same sieve, but starting every prime at 2p. Only counts the extra work."""
    flags, crossings = bytearray([1]) * (n + 1), 0
    for p in range(2, math.isqrt(n) + 1):
        if flags[p]:
            for m in range(2 * p, n + 1, p):
                flags[m] = 0
                crossings += 1
    return crossings


def trial_division_work(n):
    """Test every number on its own, dividing by 2..sqrt(i). Returns (primes, divisions)."""
    count = divisions = 0
    for i in range(2, n + 1):
        prime = True
        d = 2
        while d * d <= i:
            divisions += 1
            if i % d == 0:
                prime = False
                break
            d += 1
        count += prime
    return count, divisions


flags, _ = sieve(50)
print("primes up to 50: [" + ", ".join(str(i) for i in range(51) if flags[i]) + "]")
for k in range(1, 7):
    n = 10 ** k
    print("pi(" + str(n) + ") = " + str(sum(sieve(n)[0])))

n = 100000
flags, crossings = sieve(n)
primes, divisions = trial_division_work(n)
print("n = " + str(n) + ": " + str(sum(flags)) + " primes")
print("sieve crossings from p*p: " + str(crossings))
print("sieve crossings from 2p:  " + str(sieve_from_2p(n)))
print("trial division: " + str(primes) + " primes, " + str(divisions) + " divisions")`,
          },
          {
            label: `Smallest-prime-factor sieve and a segmented sieve`,
            code: `import math

# 1. Smallest-prime-factor sieve: factorise any number <= N in O(log n) divisions.
N = 10000
spf = list(range(N + 1))  # spf[i] = smallest prime factor of i
for p in range(2, math.isqrt(N) + 1):
    if spf[p] == p:  # p is prime
        for m in range(p * p, N + 1, p):
            if spf[m] == m:
                spf[m] = p


def factorise(x):
    parts = []
    while x > 1:
        parts.append(spf[x])
        x //= spf[x]
    return parts


for x in [84, 97, 360, 1001, 9973, 8192]:
    print(str(x) + " = " + " * ".join(str(f) for f in factorise(x)))

# 2. Segmented sieve: primes in [lo, hi] without an array of size hi.
lo, hi = 1000000000, 1000000100
root = math.isqrt(hi)
base = bytearray([1]) * (root + 1)
base[0] = base[1] = 0
for p in range(2, math.isqrt(root) + 1):
    if base[p]:
        base[p * p :: p] = bytes(len(range(p * p, root + 1, p)))
base_primes = [p for p in range(root + 1) if base[p]]

seg = bytearray([1]) * (hi - lo + 1)  # seg[i] stands for lo + i
for p in base_primes:
    start = max(p * p, (lo + p - 1) // p * p)  # first multiple of p inside [lo, hi]
    for m in range(start, hi + 1, p):
        seg[m - lo] = 0
found = [lo + i for i in range(hi - lo + 1) if seg[i]]


def is_prime_slow(v):
    if v < 2:
        return False
    d = 2
    while d * d <= v:
        if v % d == 0:
            return False
        d += 1
    return True


print("base primes up to " + str(root) + ": " + str(len(base_primes)))
print("primes in [" + str(lo) + ", " + str(hi) + "]: " + str(len(found)))
print("first " + str(found[0]) + ", last " + str(found[-1]))
print("agrees with trial division: " + str(found == [v for v in range(lo, hi + 1) if is_prime_slow(v)]).lower())`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Explain how the Sieve of Eratosthenes finds all primes up to n, then implement it in JavaScript. Why does the inner loop start at p squared, and what is the time complexity?"

**What a strong answer should cover:**
- The idea: mark every number as candidate prime, and for each prime p cross out its multiples; survivors are prime.
- The two optimisations: start at p² and stop once p² > n.
- O(n log log n) time vs O(n√n) for trial division on every number; O(n) space.
- Variations: smallest-prime-factor sieve for factorisation, segmented sieve for a window [L, R].
- JavaScript details: a \`Uint8Array\` stores one byte per flag in one contiguous block (a normal array of booleans can be several times larger); \`p * p <= n\` avoids \`Math.sqrt\` rounding; Numbers are exact up to 2^53, so window sieves near 10^9 are safe.

**Clarifying questions expected:**
- Is n inclusive, and how large can it be?
- Do you need the list, the count, or fast lookups?

**Code / implementation expected:** Yes — a sieve in JavaScript with a typed array, returning the primes or their count.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know arrays and loops in JavaScript; primes and the math are explained from scratch.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A teacher writes the numbers 2 to 100 on the board and gives the class one rule: "Circle the smallest number that is not crossed out, then cross out every multiple of it. Repeat." The first circle goes round 2, and 4, 6, 8, ... disappear. Then 3 is circled and 6, 9, 12, ... go. 4 is already crossed out, so the next circle is 5. After a few rounds, everything still standing is a prime, and nobody ever divided anything.

That classroom game is the **Sieve of Eratosthenes**, named after the Greek scholar who described it more than 2,000 years ago. It finds *all* primes up to n at once, and it does so by crossing out instead of testing, which is dramatically less work than checking each number on its own.

Interviewers ask about it because it is the standard answer to "count the primes below n" or "precompute primes for many queries", because the two small optimisations (start at p², stop at √n) test whether you understand *why* it works, and because its running time, O(n log log n), is one of the few non-obvious complexities you are expected to know.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How large is n? | The sieve needs one flag per number: 10^7 flags is about 10 MB as bytes, fine; 10^10 is not, which calls for a segmented sieve. |
| Do you want the list of primes, the count, or fast "is x prime?" lookups? | All three come from the same flag array, but the output format changes the memory you keep. |
| Is n included? ("primes up to n" vs "less than n") | An off-by-one here is the most common wrong answer. |
| Is it one number or many? | To test one number, trial division up to √x is enough; the sieve pays off when you need many primes or many queries. |
| Do you need factorisations too? | A smallest-prime-factor sieve gives every factorisation up to n in O(log x) each (section 8). |
| Is the range far from zero, like [10^9, 10^9 + 100]? | Then sieve only that window with the primes up to √R (segmented sieve). |

## 3. Primes and the Slow Way

A **prime** is a whole number greater than 1 whose only divisors are 1 and itself: 2, 3, 5, 7, 11, ... A number greater than 1 that is not prime is **composite**; 1 is neither.

📌 **Interview term: Prime / composite** — a prime has exactly two divisors, 1 and itself; a composite number (greater than 1) has more. 0 and 1 are neither.

The obvious test checks one number at a time: try dividing x by 2, 3, 4, ... and stop at √x, because if x = a · b with a ≤ b, then a ≤ √x. Doing that for every number up to n costs up to √n divisions per number, about O(n√n) in total. For n = 100,000, example 1 counts **2,745,694** divisions.

📌 **Interview term: Trial division** — testing whether x is prime by dividing it by every candidate from 2 up to √x. O(√x) for one number.

## 4. The Sieve

Instead of asking "does anything divide x?" for every x, the sieve turns the question around: "for each prime p, which numbers does p divide?" Those are just p's multiples, and you can walk them with a step of p, no division needed.

1. Make a list of flags \`is_prime[0..n]\`, all true except 0 and 1.
2. For p = 2, 3, 4, ...: if \`is_prime[p]\` is still true, p is prime; set \`is_prime[m] = false\` for every multiple m of p.
3. Whatever is still true at the end is prime.

The board for n = 30 after sieving:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="The numbers 1 to 30 after sieving: 2 3 5 7 11 13 17 19 23 29 remain as primes and every other number from 4 up is crossed out">
  <rect class="d-box" x="20" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="50" y="52" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="88" y="20" width="60" height="52" rx="8"/>
  <text class="d-text" x="118" y="52" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="156" y="20" width="60" height="52" rx="8"/>
  <text class="d-text" x="186" y="52" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="224" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="254" y="52" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="292" y="20" width="60" height="52" rx="8"/>
  <text class="d-text" x="322" y="52" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="360" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="390" y="52" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="428" y="20" width="60" height="52" rx="8"/>
  <text class="d-text" x="458" y="52" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="496" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="526" y="52" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="564" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="594" y="52" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="632" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="662" y="52" text-anchor="middle">10</text>
  <rect class="d-box-accent" x="20" y="92" width="60" height="52" rx="8"/>
  <text class="d-text" x="50" y="124" text-anchor="middle">11</text>
  <rect class="d-box-muted" x="88" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="118" y="124" text-anchor="middle">12</text>
  <rect class="d-box-accent" x="156" y="92" width="60" height="52" rx="8"/>
  <text class="d-text" x="186" y="124" text-anchor="middle">13</text>
  <rect class="d-box-muted" x="224" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="254" y="124" text-anchor="middle">14</text>
  <rect class="d-box-muted" x="292" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="322" y="124" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="360" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="390" y="124" text-anchor="middle">16</text>
  <rect class="d-box-accent" x="428" y="92" width="60" height="52" rx="8"/>
  <text class="d-text" x="458" y="124" text-anchor="middle">17</text>
  <rect class="d-box-muted" x="496" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="526" y="124" text-anchor="middle">18</text>
  <rect class="d-box-accent" x="564" y="92" width="60" height="52" rx="8"/>
  <text class="d-text" x="594" y="124" text-anchor="middle">19</text>
  <rect class="d-box-muted" x="632" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="662" y="124" text-anchor="middle">20</text>
  <rect class="d-box-muted" x="20" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="50" y="196" text-anchor="middle">21</text>
  <rect class="d-box-muted" x="88" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="118" y="196" text-anchor="middle">22</text>
  <rect class="d-box-accent" x="156" y="164" width="60" height="52" rx="8"/>
  <text class="d-text" x="186" y="196" text-anchor="middle">23</text>
  <rect class="d-box-muted" x="224" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="254" y="196" text-anchor="middle">24</text>
  <rect class="d-box-muted" x="292" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="322" y="196" text-anchor="middle">25</text>
  <rect class="d-box-muted" x="360" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="390" y="196" text-anchor="middle">26</text>
  <rect class="d-box-muted" x="428" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="458" y="196" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="496" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="526" y="196" text-anchor="middle">28</text>
  <rect class="d-box-accent" x="564" y="164" width="60" height="52" rx="8"/>
  <text class="d-text" x="594" y="196" text-anchor="middle">29</text>
  <rect class="d-box-muted" x="632" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="662" y="196" text-anchor="middle">30</text>
</svg>

The highlighted cells (2, 3, 5, 7, 11, 13, 17, 19, 23, 29) were never crossed out; the faded ones were crossed out as a multiple of some smaller prime. Only 2, 3 and 5 actually had to sieve, as the second optimisation below explains.

📌 **Interview term: Sieve of Eratosthenes** — find all primes up to n by crossing out the multiples of each prime in turn; the numbers never crossed out are prime.

### Optimisation 1: start crossing at p²

Every multiple of p smaller than p² is \`k · p\` with k < p, so it has a smaller prime factor and was already crossed out in an earlier round. The first multiple that is new is p · p.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 160" role="img" aria-label="Multiples of 5 up to 30: 10 and 20 and 30 were crossed by 2, 15 by 3, and 25 is the first one 5 has to cross itself">
  <rect class="d-box-muted" x="20" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="75" y="64" text-anchor="middle">10</text>
  <text class="d-sub" x="75" y="90" text-anchor="middle">done by 2</text>
  <rect class="d-box-muted" x="160" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="215" y="64" text-anchor="middle">15</text>
  <text class="d-sub" x="215" y="90" text-anchor="middle">done by 3</text>
  <rect class="d-box-muted" x="300" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="355" y="64" text-anchor="middle">20</text>
  <text class="d-sub" x="355" y="90" text-anchor="middle">done by 2</text>
  <rect class="d-box-accent" x="440" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="495" y="64" text-anchor="middle">25 = 5 x 5</text>
  <text class="d-sub" x="495" y="90" text-anchor="middle">first new one</text>
  <rect class="d-box-muted" x="580" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="635" y="64" text-anchor="middle">30</text>
  <text class="d-sub" x="635" y="90" text-anchor="middle">done by 2</text>
</svg>

When it is 5's turn, every multiple of 5 below 25 has a factor 2 or 3 and is already gone, so the inner loop starts at 25. (30 is crossed again, harmlessly: the sieve does cross some numbers more than once.)

### Optimisation 2: stop when p² > n

If p² > n, then p has nothing new to cross out (its first new multiple is beyond n). So the outer loop only runs while \`p * p <= n\`. For n = 30 only 2, 3 and 5 sieve; 7 · 7 = 49 is already past 30.

How much do they save? For n = 100,000, example 1 counts **193,078** crossings when each prime starts at p², against **202,154** when it starts at 2p. The bigger saving comes from the stopping rule, which skips all primes above √n = 316 entirely.

📌 **Interview term: p² start / √n stop** — the two standard sieve optimisations: begin crossing out at p·p, and stop the outer loop once p·p > n.

## 5. Why It Is O(n log log n)

Prime p crosses out about n / p numbers. The total work is

> n/2 + n/3 + n/5 + n/7 + ... (over primes up to √n)

and the sum of 1/p over primes up to x grows like **ln ln x**, a function that grows unbelievably slowly (ln ln 10^9 is about 3). So the sieve does O(n log log n) work in total, which for practical purposes is linear. Compare the measured counts for n = 100,000: 193,078 crossings, roughly 1.9 per number, against 2,745,694 trial divisions.

📌 **Interview term: O(n log log n)** — the running time of the sieve: n times the sum of 1/p over primes, which grows like log log n. Almost linear in practice.

The space is one flag per number, O(n). That, not time, is usually the limit: the next sections show how each language stores the flags compactly, and section 8 shows the segmented sieve that needs only O(√n) memory. See [space complexity](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) for how to talk about that trade-off, and [Big-O notation](/interview-question/what-is-big-o-notation) for the notation itself.

## 6. The Code in JavaScript

~~~javascript
function sieve(n) {
  // isPrime[i] is 1 when i is prime, for 0 <= i <= n. Returns [flags, crossings].
  const isPrime = new Uint8Array(n + 1).fill(1); // 1 byte per number, zero-initialised then filled
  isPrime[0] = 0; // 0 and 1 are not prime
  if (n >= 1) isPrime[1] = 0;
  let crossings = 0;
  for (let p = 2; p * p <= n; p++) { // a composite <= n has a prime factor <= sqrt(n)
    if (!isPrime[p]) continue;
    // start at p*p: smaller multiples of p were crossed out by smaller primes
    for (let m = p * p; m <= n; m += p) {
      isPrime[m] = 0;
      crossings++;
    }
  }
  return [isPrime, crossings];
}
~~~

The \`crossings\` counter is only there for the comparison in example 1.

**What to point out in this code:**

- **\`Uint8Array\` instead of a plain array.** A typed array is one contiguous block of bytes, zero-initialised, with a fixed length: one byte per flag. A regular \`Array\` of booleans is managed by the engine and is typically much larger per element; for n in the millions the typed array is the right tool.
- \`new Uint8Array(n + 1).fill(1)\` allocates n + 1 flags, so n itself is included.
- **The bound is \`p * p <= n\`**, integer arithmetic, rather than \`p <= Math.sqrt(n)\`, which is a floating-point value. Both work for moderate n, but the multiplication avoids any rounding question.
- The inner loop \`for (let m = p * p; m <= n; m += p)\` steps by p, so there is no division or modulo anywhere in the sieve.
- \`flags.reduce((s, v) => s + v, 0)\` counts the primes, because each flag is 0 or 1.
- Numbers are exact integers up to 2^53, so \`p * p\` and the window bounds of a segmented sieve near 10^9 are exact (example 2).

## 7. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — primes up to 50, π(n) for n = 10 to 10^6, and the work compared with trial division** prints:

~~~text
primes up to 50: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]
pi(10) = 4
pi(100) = 25
pi(1000) = 168
pi(10000) = 1229
pi(100000) = 9592
pi(1000000) = 78498
n = 100000: 9592 primes
sieve crossings from p*p: 193078
sieve crossings from 2p:  202154
trial division: 9592 primes, 2745694 divisions
~~~

π(n) is the usual name for the number of primes up to n; 78,498 primes up to a million is the well-known value. The sieve's 193,078 crossings against 2,745,694 trial divisions is the n log log n vs n√n gap.

**Example 2 — smallest-prime-factor factorisation and a segmented sieve on [10^9, 10^9 + 100]** prints:

~~~text
84 = 2 * 2 * 3 * 7
97 = 97
360 = 2 * 2 * 2 * 3 * 3 * 5
1001 = 7 * 11 * 13
9973 = 9973
8192 = 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2
base primes up to 31622: 3401
primes in [1000000000, 1000000100]: 7
first 1000000007, last 1000000097
agrees with trial division: true
~~~

The SPF table is an \`Int32Array\`, and the window sieve only allocated 101 flags plus 31,623 for the base primes.

## 8. Two Variations Worth Knowing

**Smallest-prime-factor (SPF) sieve.** Instead of a true/false flag, store for every number its smallest prime factor: initialise \`spf[i] = i\`, and when prime p crosses out m, set \`spf[m] = p\` if it is still \`m\`. Then any x ≤ n factorises by repeated division, \`x = spf[x] · (x / spf[x])\`, in O(log x) steps, because every step at least halves x. Example 2 factorises 360 as 2 · 2 · 2 · 3 · 3 · 5 this way.

📌 **Interview term: Smallest prime factor (SPF) sieve** — a sieve that records the smallest prime factor of every number up to n, so any of them can be factorised in O(log x).

**Segmented sieve.** To find primes in a window [L, R] far from zero (example 2 uses [1,000,000,000, 1,000,000,100]), first sieve the small primes up to √R (3,401 primes up to 31,622), then cross out their multiples inside the window only, starting at the first multiple ≥ L (and never below p²). Memory is O(√R + (R - L)) instead of O(R). The window holds 7 primes, from 1,000,000,007 to 1,000,000,097, and example 2 confirms them against trial division.

📌 **Interview term: Segmented sieve** — sieving a window [L, R] using only the primes up to √R, so memory is proportional to the window and √R rather than to R.

There is also a **linear sieve** that crosses out each composite exactly once (O(n) time), useful when you need the SPF array anyway; in interviews, the classic sieve is the expected answer.

## 9. Complexity

| Method | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Trial division, one number x | O(√x) | O(1) | divisors up to √x |
| Trial division, every number up to n | O(n√n) | O(1) | √x per number |
| **Sieve of Eratosthenes** | **O(n log log n)** | **O(n)** | n/p crossings per prime p ≤ √n |
| SPF sieve + factorise one x | O(n log log n) once, then O(log x) | O(n) | each division at least halves x |
| Segmented sieve on [L, R] | O((R - L) log log R + √R log log √R) | O(√R + R - L) | base primes, then the window |

The flag array is the real cost: n bytes as a byte array, or n/8 bytes if each flag is a single bit.

## Edge Cases

- **n < 2:** there are no primes; the code must not write \`is_prime[1]\` when the array has only one element (n = 0).
- **n = 2:** the outer loop does not run (2 · 2 > 2); the answer is [2].
- **n itself prime:** "up to n" includes n, so the array has n + 1 entries.
- **Perfect squares:** n = 25 must cross out 25, so the condition is \`p * p <= n\`, not \`<\`.
- **Overflow of p · p:** for n near the 32-bit limit, \`p * p\` overflows a 32-bit int; compute it in 64 bits.
- **Large n:** memory runs out before time does; use bits or a segmented sieve.

## Common Pitfalls

- **Off-by-one on n.** \`new Uint8Array(n)\` has indices 0..n-1; allocate \`n + 1\`.
- **\`new Array(n).fill(true)\` for large n.** It works, but it is far heavier than a \`Uint8Array\` and slower to scan.
- **Writing past the end of a typed array.** Out-of-range writes are silently ignored, so an off-by-one does not crash, it just gives a wrong answer.
- **\`Math.sqrt\` bound with \`<\`.** \`p < Math.sqrt(n)\` misses p = √n, so 25 survives in a sieve up to 25; use \`p * p <= n\`.
- **Building the result with \`concat\` in a loop.** Push into one array, or count with a running total.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">Flags for 0..n, all 1 except 0 and 1; for each p still 1, cross out its multiples; survivors are prime.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Start at p²:</strong> <span style="color:#f0e2c8;">Multiples below p·p have a smaller prime factor, so they are already crossed out.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Stop at √n:</strong> <span style="color:#f0e2c8;">Loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for (let p = 2; p * p &lt;= n; p++)</code>: a prime above √n has nothing new to cross out.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n log log n) time (sum of n/p over primes), O(n) space; 193,078 crossings vs 2,745,694 trial divisions at n = 100,000.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new Uint8Array(n + 1).fill(1)</code> gives compact, contiguous flags; the inner loop steps by p with no division.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it n log log n and not n log n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prime p crosses about n/p numbers, and the sum of 1/p over primes up to x grows like log log x, because primes thin out.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Uint8Array</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One byte per flag in one contiguous buffer, zero-initialised, and fast to scan; a regular array of booleans costs much more memory per element.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you factorise many numbers quickly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A smallest-prime-factor sieve in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Int32Array</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">spf[m] = p</code> the first time m is crossed, then divide by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">spf[x]</code> repeatedly, O(log x) each.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if n is 10^10?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Too many flags for memory. Sieve the base primes up to √n, then sieve one block at a time (segmented sieve); 10^10 is still below 2^53, so Numbers stay exact.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use a bitset to save memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: pack 32 flags per element of a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Uint32Array</code> and test with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(words[i &gt;&gt;&gt; 5] &gt;&gt;&gt; (i &amp; 31)) &amp; 1</code>, 8 times less memory than one byte per flag.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prime / composite** | Exactly two divisors / more than two (0 and 1 are neither) |
| **Trial division** | Divide by every candidate up to √x |
| **Sieve of Eratosthenes** | Cross out multiples of each prime; survivors are prime |
| **p² start / √n stop** | Start crossing at p·p; stop when p·p > n |
| **O(n log log n)** | The sieve's running time, almost linear |
| **Smallest prime factor (SPF) sieve** | Store each number's smallest prime factor for fast factorisation |
| **Segmented sieve** | Sieve a window [L, R] with the primes up to √R |

---
**Conclusion:** The Sieve of Eratosthenes finds every prime up to n by crossing out the multiples of each prime instead of testing numbers one at a time; starting at p² and stopping at √n keep it at O(n log log n) time and O(n) space, against O(n√n) for trial division. In JavaScript, a \`Uint8Array\` of n + 1 flags with an integer \`p * p <= n\` bound is the clean implementation; the SPF variant gives fast factorisations, and the segmented sieve handles windows far beyond what fits in memory.`,
        examples: [
          {
            label: `Sieve up to n: primes, prime counts and work vs trial division`,
            code: `function sieve(n) {
  // isPrime[i] is 1 when i is prime, for 0 <= i <= n. Returns [flags, crossings].
  const isPrime = new Uint8Array(n + 1).fill(1); // 1 byte per number, zero-initialised then filled
  isPrime[0] = 0; // 0 and 1 are not prime
  if (n >= 1) isPrime[1] = 0;
  let crossings = 0;
  for (let p = 2; p * p <= n; p++) { // a composite <= n has a prime factor <= sqrt(n)
    if (!isPrime[p]) continue;
    // start at p*p: smaller multiples of p were crossed out by smaller primes
    for (let m = p * p; m <= n; m += p) {
      isPrime[m] = 0;
      crossings++;
    }
  }
  return [isPrime, crossings];
}

function sieveFrom2p(n) {
  // The same sieve, but starting every prime at 2p. Only counts the extra work.
  const flags = new Uint8Array(n + 1).fill(1);
  let crossings = 0;
  for (let p = 2; p * p <= n; p++) {
    if (!flags[p]) continue;
    for (let m = 2 * p; m <= n; m += p) {
      flags[m] = 0;
      crossings++;
    }
  }
  return crossings;
}

function trialDivisionWork(n) {
  // Test every number on its own, dividing by 2..sqrt(i).
  let count = 0, divisions = 0;
  for (let i = 2; i <= n; i++) {
    let prime = true;
    for (let d = 2; d * d <= i; d++) {
      divisions++;
      if (i % d === 0) { prime = false; break; }
    }
    if (prime) count++;
  }
  return [count, divisions];
}

const countOnes = (flags) => flags.reduce((s, v) => s + v, 0);

const [small] = sieve(50);
const list = [];
for (let i = 0; i <= 50; i++) if (small[i]) list.push(i);
console.log('primes up to 50: [' + list.join(', ') + ']');
for (let k = 1; k <= 6; k++) {
  const n = 10 ** k;
  console.log('pi(' + n + ') = ' + countOnes(sieve(n)[0]));
}

const n = 100000;
const [flags, crossings] = sieve(n);
const [primes, divisions] = trialDivisionWork(n);
console.log('n = ' + n + ': ' + countOnes(flags) + ' primes');
console.log('sieve crossings from p*p: ' + crossings);
console.log('sieve crossings from 2p:  ' + sieveFrom2p(n));
console.log('trial division: ' + primes + ' primes, ' + divisions + ' divisions');`,
          },
          {
            label: `Smallest-prime-factor sieve and a segmented sieve`,
            code: `// 1. Smallest-prime-factor sieve: factorise any number <= N in O(log n) divisions.
const N = 10000;
const spf = new Int32Array(N + 1);
for (let i = 0; i <= N; i++) spf[i] = i; // spf[i] = smallest prime factor of i
for (let p = 2; p * p <= N; p++) {
  if (spf[p] !== p) continue; // p is not prime
  for (let m = p * p; m <= N; m += p) if (spf[m] === m) spf[m] = p;
}

function factorise(x) {
  const parts = [];
  while (x > 1) {
    parts.push(spf[x]);
    x /= spf[x]; // exact: spf[x] divides x
  }
  return parts;
}

for (const x of [84, 97, 360, 1001, 9973, 8192]) console.log(x + ' = ' + factorise(x).join(' * '));

// 2. Segmented sieve: primes in [lo, hi] without an array of size hi.
const lo = 1000000000, hi = 1000000100;
const root = Math.floor(Math.sqrt(hi)); // safe here; check root * root for huge values
const base = new Uint8Array(root + 1).fill(1);
base[0] = base[1] = 0;
for (let p = 2; p * p <= root; p++) {
  if (!base[p]) continue;
  for (let m = p * p; m <= root; m += p) base[m] = 0;
}
const basePrimes = [];
for (let p = 2; p <= root; p++) if (base[p]) basePrimes.push(p);

const seg = new Uint8Array(hi - lo + 1).fill(1); // seg[i] stands for lo + i
for (const p of basePrimes) {
  const start = Math.max(p * p, Math.ceil(lo / p) * p); // first multiple of p inside [lo, hi]
  for (let m = start; m <= hi; m += p) seg[m - lo] = 0;
}
const found = [];
for (let i = 0; i <= hi - lo; i++) if (seg[i]) found.push(lo + i);

function isPrimeSlow(v) {
  if (v < 2) return false;
  for (let d = 2; d * d <= v; d++) if (v % d === 0) return false;
  return true;
}
const slow = [];
for (let v = lo; v <= hi; v++) if (isPrimeSlow(v)) slow.push(v);

console.log('base primes up to ' + root + ': ' + basePrimes.length);
console.log('primes in [' + lo + ', ' + hi + ']: ' + found.length);
console.log('first ' + found[0] + ', last ' + found[found.length - 1]);
console.log('agrees with trial division: ' + (found.join() === slow.join()));`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Explain how the Sieve of Eratosthenes finds all primes up to n, then implement it in Java. Why does the inner loop start at p squared, and what is the time complexity?"

**What a strong answer should cover:**
- The idea: mark every number as candidate prime, and for each prime p cross out its multiples; survivors are prime.
- The two optimisations: start at p² and stop once p² > n.
- O(n log log n) time vs O(n√n) for trial division on every number; O(n) space.
- Variations: smallest-prime-factor sieve for factorisation, segmented sieve for a window [L, R].
- Java details: \`boolean[]\` starts all \`false\` (so either fill it or store "composite" flags); \`p * p\` overflows \`int\` once p passes 46,340, so compare in \`long\`; \`java.util.BitSet\` packs flags into bits; segmented bounds near 10^9 need \`long\` arithmetic.

**Clarifying questions expected:**
- Is n inclusive, and how large can it be?
- Do you need the list, the count, or fast lookups?

**Code / implementation expected:** Yes — a sieve in Java returning the primes or their count up to n.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know arrays and loops in Java; primes and the math are explained from scratch.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A teacher writes the numbers 2 to 100 on the board and gives the class one rule: "Circle the smallest number that is not crossed out, then cross out every multiple of it. Repeat." The first circle goes round 2, and 4, 6, 8, ... disappear. Then 3 is circled and 6, 9, 12, ... go. 4 is already crossed out, so the next circle is 5. After a few rounds, everything still standing is a prime, and nobody ever divided anything.

That classroom game is the **Sieve of Eratosthenes**, named after the Greek scholar who described it more than 2,000 years ago. It finds *all* primes up to n at once, and it does so by crossing out instead of testing, which is dramatically less work than checking each number on its own.

Interviewers ask about it because it is the standard answer to "count the primes below n" or "precompute primes for many queries", because the two small optimisations (start at p², stop at √n) test whether you understand *why* it works, and because its running time, O(n log log n), is one of the few non-obvious complexities you are expected to know.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How large is n? | The sieve needs one flag per number: 10^7 flags is about 10 MB as bytes, fine; 10^10 is not, which calls for a segmented sieve. |
| Do you want the list of primes, the count, or fast "is x prime?" lookups? | All three come from the same flag array, but the output format changes the memory you keep. |
| Is n included? ("primes up to n" vs "less than n") | An off-by-one here is the most common wrong answer. |
| Is it one number or many? | To test one number, trial division up to √x is enough; the sieve pays off when you need many primes or many queries. |
| Do you need factorisations too? | A smallest-prime-factor sieve gives every factorisation up to n in O(log x) each (section 8). |
| Is the range far from zero, like [10^9, 10^9 + 100]? | Then sieve only that window with the primes up to √R (segmented sieve). |

## 3. Primes and the Slow Way

A **prime** is a whole number greater than 1 whose only divisors are 1 and itself: 2, 3, 5, 7, 11, ... A number greater than 1 that is not prime is **composite**; 1 is neither.

📌 **Interview term: Prime / composite** — a prime has exactly two divisors, 1 and itself; a composite number (greater than 1) has more. 0 and 1 are neither.

The obvious test checks one number at a time: try dividing x by 2, 3, 4, ... and stop at √x, because if x = a · b with a ≤ b, then a ≤ √x. Doing that for every number up to n costs up to √n divisions per number, about O(n√n) in total. For n = 100,000, example 1 counts **2,745,694** divisions.

📌 **Interview term: Trial division** — testing whether x is prime by dividing it by every candidate from 2 up to √x. O(√x) for one number.

## 4. The Sieve

Instead of asking "does anything divide x?" for every x, the sieve turns the question around: "for each prime p, which numbers does p divide?" Those are just p's multiples, and you can walk them with a step of p, no division needed.

1. Make a list of flags \`is_prime[0..n]\`, all true except 0 and 1.
2. For p = 2, 3, 4, ...: if \`is_prime[p]\` is still true, p is prime; set \`is_prime[m] = false\` for every multiple m of p.
3. Whatever is still true at the end is prime.

The board for n = 30 after sieving:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="The numbers 1 to 30 after sieving: 2 3 5 7 11 13 17 19 23 29 remain as primes and every other number from 4 up is crossed out">
  <rect class="d-box" x="20" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="50" y="52" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="88" y="20" width="60" height="52" rx="8"/>
  <text class="d-text" x="118" y="52" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="156" y="20" width="60" height="52" rx="8"/>
  <text class="d-text" x="186" y="52" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="224" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="254" y="52" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="292" y="20" width="60" height="52" rx="8"/>
  <text class="d-text" x="322" y="52" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="360" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="390" y="52" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="428" y="20" width="60" height="52" rx="8"/>
  <text class="d-text" x="458" y="52" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="496" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="526" y="52" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="564" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="594" y="52" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="632" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="662" y="52" text-anchor="middle">10</text>
  <rect class="d-box-accent" x="20" y="92" width="60" height="52" rx="8"/>
  <text class="d-text" x="50" y="124" text-anchor="middle">11</text>
  <rect class="d-box-muted" x="88" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="118" y="124" text-anchor="middle">12</text>
  <rect class="d-box-accent" x="156" y="92" width="60" height="52" rx="8"/>
  <text class="d-text" x="186" y="124" text-anchor="middle">13</text>
  <rect class="d-box-muted" x="224" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="254" y="124" text-anchor="middle">14</text>
  <rect class="d-box-muted" x="292" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="322" y="124" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="360" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="390" y="124" text-anchor="middle">16</text>
  <rect class="d-box-accent" x="428" y="92" width="60" height="52" rx="8"/>
  <text class="d-text" x="458" y="124" text-anchor="middle">17</text>
  <rect class="d-box-muted" x="496" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="526" y="124" text-anchor="middle">18</text>
  <rect class="d-box-accent" x="564" y="92" width="60" height="52" rx="8"/>
  <text class="d-text" x="594" y="124" text-anchor="middle">19</text>
  <rect class="d-box-muted" x="632" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="662" y="124" text-anchor="middle">20</text>
  <rect class="d-box-muted" x="20" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="50" y="196" text-anchor="middle">21</text>
  <rect class="d-box-muted" x="88" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="118" y="196" text-anchor="middle">22</text>
  <rect class="d-box-accent" x="156" y="164" width="60" height="52" rx="8"/>
  <text class="d-text" x="186" y="196" text-anchor="middle">23</text>
  <rect class="d-box-muted" x="224" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="254" y="196" text-anchor="middle">24</text>
  <rect class="d-box-muted" x="292" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="322" y="196" text-anchor="middle">25</text>
  <rect class="d-box-muted" x="360" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="390" y="196" text-anchor="middle">26</text>
  <rect class="d-box-muted" x="428" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="458" y="196" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="496" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="526" y="196" text-anchor="middle">28</text>
  <rect class="d-box-accent" x="564" y="164" width="60" height="52" rx="8"/>
  <text class="d-text" x="594" y="196" text-anchor="middle">29</text>
  <rect class="d-box-muted" x="632" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="662" y="196" text-anchor="middle">30</text>
</svg>

The highlighted cells (2, 3, 5, 7, 11, 13, 17, 19, 23, 29) were never crossed out; the faded ones were crossed out as a multiple of some smaller prime. Only 2, 3 and 5 actually had to sieve, as the second optimisation below explains.

📌 **Interview term: Sieve of Eratosthenes** — find all primes up to n by crossing out the multiples of each prime in turn; the numbers never crossed out are prime.

### Optimisation 1: start crossing at p²

Every multiple of p smaller than p² is \`k · p\` with k < p, so it has a smaller prime factor and was already crossed out in an earlier round. The first multiple that is new is p · p.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 160" role="img" aria-label="Multiples of 5 up to 30: 10 and 20 and 30 were crossed by 2, 15 by 3, and 25 is the first one 5 has to cross itself">
  <rect class="d-box-muted" x="20" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="75" y="64" text-anchor="middle">10</text>
  <text class="d-sub" x="75" y="90" text-anchor="middle">done by 2</text>
  <rect class="d-box-muted" x="160" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="215" y="64" text-anchor="middle">15</text>
  <text class="d-sub" x="215" y="90" text-anchor="middle">done by 3</text>
  <rect class="d-box-muted" x="300" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="355" y="64" text-anchor="middle">20</text>
  <text class="d-sub" x="355" y="90" text-anchor="middle">done by 2</text>
  <rect class="d-box-accent" x="440" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="495" y="64" text-anchor="middle">25 = 5 x 5</text>
  <text class="d-sub" x="495" y="90" text-anchor="middle">first new one</text>
  <rect class="d-box-muted" x="580" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="635" y="64" text-anchor="middle">30</text>
  <text class="d-sub" x="635" y="90" text-anchor="middle">done by 2</text>
</svg>

When it is 5's turn, every multiple of 5 below 25 has a factor 2 or 3 and is already gone, so the inner loop starts at 25. (30 is crossed again, harmlessly: the sieve does cross some numbers more than once.)

### Optimisation 2: stop when p² > n

If p² > n, then p has nothing new to cross out (its first new multiple is beyond n). So the outer loop only runs while \`p * p <= n\`. For n = 30 only 2, 3 and 5 sieve; 7 · 7 = 49 is already past 30.

How much do they save? For n = 100,000, example 1 counts **193,078** crossings when each prime starts at p², against **202,154** when it starts at 2p. The bigger saving comes from the stopping rule, which skips all primes above √n = 316 entirely.

📌 **Interview term: p² start / √n stop** — the two standard sieve optimisations: begin crossing out at p·p, and stop the outer loop once p·p > n.

## 5. Why It Is O(n log log n)

Prime p crosses out about n / p numbers. The total work is

> n/2 + n/3 + n/5 + n/7 + ... (over primes up to √n)

and the sum of 1/p over primes up to x grows like **ln ln x**, a function that grows unbelievably slowly (ln ln 10^9 is about 3). So the sieve does O(n log log n) work in total, which for practical purposes is linear. Compare the measured counts for n = 100,000: 193,078 crossings, roughly 1.9 per number, against 2,745,694 trial divisions.

📌 **Interview term: O(n log log n)** — the running time of the sieve: n times the sum of 1/p over primes, which grows like log log n. Almost linear in practice.

The space is one flag per number, O(n). That, not time, is usually the limit: the next sections show how each language stores the flags compactly, and section 8 shows the segmented sieve that needs only O(√n) memory. See [space complexity](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) for how to talk about that trade-off, and [Big-O notation](/interview-question/what-is-big-o-notation) for the notation itself.

## 6. The Code in Java

~~~java
static boolean[] sieve(int n) {
    // isPrime[i] is true when i is prime. boolean[] starts all false, so fill it.
    boolean[] isPrime = new boolean[n + 1];
    for (int i = 2; i <= n; i++) isPrime[i] = true;
    crossings = 0;
    for (int p = 2; (long) p * p <= n; p++) { // long: p * p overflows int near 46341
        if (!isPrime[p]) continue;
        // start at p*p: smaller multiples of p were crossed out by smaller primes
        for (int m = p * p; m <= n; m += p) {
            isPrime[m] = false;
            crossings++;
        }
    }
    return isPrime;
}
~~~

The \`crossings\` field is only there for the comparison in example 1.

**What to point out in this code:**

- **\`new boolean[n + 1]\` is all \`false\`**, so the code fills 2..n with \`true\` first. The alternative, used by \`sieveFrom2p\` and the segmented sieve in the examples, is to store \`composite\` flags, where the default \`false\` already means "not crossed out yet".
- **Overflow in \`p * p\`.** For n near \`Integer.MAX_VALUE\`, \`p * p\` overflows \`int\` once p ≥ 46,341, wraps negative and the loop condition becomes wrong. \`(long) p * p <= n\` is safe for every \`int\` n.
- A \`boolean[]\` element takes one byte in typical JVMs (the JVM specification does not fix it). \`java.util.BitSet\` stores one bit per flag, 8 times smaller, with \`set\`, \`clear\`, \`get\` and \`nextClearBit\`; it is the natural choice for n in the hundreds of millions.
- The segmented sieve in example 2 works in \`long\` because \`p * p\` and \`(lo + p - 1) / p * p\` exceed \`int\` range for windows near 10^9 and larger.
- Collecting primes into a \`List<Integer>\` boxes every value; for counting, keep an \`int\` counter, and for large outputs an \`int[]\`.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`javac Main.java && java Main\` (OpenJDK 21). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — primes up to 50, π(n) for n = 10 to 10^6, and the work compared with trial division** prints:

~~~text
primes up to 50: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]
pi(10) = 4
pi(100) = 25
pi(1000) = 168
pi(10000) = 1229
pi(100000) = 9592
pi(1000000) = 78498
n = 100000: 9592 primes
sieve crossings from p*p: 193078
sieve crossings from 2p:  202154
trial division: 9592 primes, 2745694 divisions
~~~

π(n) is the usual name for the number of primes up to n; 78,498 primes up to a million is the well-known value. The sieve's 193,078 crossings against 2,745,694 trial divisions is the n log log n vs n√n gap.

**Example 2 — smallest-prime-factor factorisation and a segmented sieve on [10^9, 10^9 + 100]** prints:

~~~text
84 = 2 * 2 * 3 * 7
97 = 97
360 = 2 * 2 * 2 * 3 * 3 * 5
1001 = 7 * 11 * 13
9973 = 9973
8192 = 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2
base primes up to 31622: 3401
primes in [1000000000, 1000000100]: 7
first 1000000007, last 1000000097
agrees with trial division: true
~~~

The window is compared with trial division using \`List.equals\`, which compares the \`Long\` values; \`==\` on two lists would compare object identity.

## 8. Two Variations Worth Knowing

**Smallest-prime-factor (SPF) sieve.** Instead of a true/false flag, store for every number its smallest prime factor: initialise \`spf[i] = i\`, and when prime p crosses out m, set \`spf[m] = p\` if it is still \`m\`. Then any x ≤ n factorises by repeated division, \`x = spf[x] · (x / spf[x])\`, in O(log x) steps, because every step at least halves x. Example 2 factorises 360 as 2 · 2 · 2 · 3 · 3 · 5 this way.

📌 **Interview term: Smallest prime factor (SPF) sieve** — a sieve that records the smallest prime factor of every number up to n, so any of them can be factorised in O(log x).

**Segmented sieve.** To find primes in a window [L, R] far from zero (example 2 uses [1,000,000,000, 1,000,000,100]), first sieve the small primes up to √R (3,401 primes up to 31,622), then cross out their multiples inside the window only, starting at the first multiple ≥ L (and never below p²). Memory is O(√R + (R - L)) instead of O(R). The window holds 7 primes, from 1,000,000,007 to 1,000,000,097, and example 2 confirms them against trial division.

📌 **Interview term: Segmented sieve** — sieving a window [L, R] using only the primes up to √R, so memory is proportional to the window and √R rather than to R.

There is also a **linear sieve** that crosses out each composite exactly once (O(n) time), useful when you need the SPF array anyway; in interviews, the classic sieve is the expected answer.

## 9. Complexity

| Method | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Trial division, one number x | O(√x) | O(1) | divisors up to √x |
| Trial division, every number up to n | O(n√n) | O(1) | √x per number |
| **Sieve of Eratosthenes** | **O(n log log n)** | **O(n)** | n/p crossings per prime p ≤ √n |
| SPF sieve + factorise one x | O(n log log n) once, then O(log x) | O(n) | each division at least halves x |
| Segmented sieve on [L, R] | O((R - L) log log R + √R log log √R) | O(√R + R - L) | base primes, then the window |

The flag array is the real cost: n bytes as a byte array, or n/8 bytes if each flag is a single bit.

## Edge Cases

- **n < 2:** there are no primes; the code must not write \`is_prime[1]\` when the array has only one element (n = 0).
- **n = 2:** the outer loop does not run (2 · 2 > 2); the answer is [2].
- **n itself prime:** "up to n" includes n, so the array has n + 1 entries.
- **Perfect squares:** n = 25 must cross out 25, so the condition is \`p * p <= n\`, not \`<\`.
- **Overflow of p · p:** for n near the 32-bit limit, \`p * p\` overflows a 32-bit int; compute it in 64 bits.
- **Large n:** memory runs out before time does; use bits or a segmented sieve.

## Common Pitfalls

- **Forgetting that \`boolean[]\` starts \`false\`.** A sieve that only crosses out ends with no primes at all; fill with \`true\` or store composite flags.
- **\`int\` overflow in \`p * p\` or \`m += p\`.** Near \`Integer.MAX_VALUE\`, \`m += p\` can wrap negative and loop forever; use \`long\`.
- **Off-by-one on n.** \`new boolean[n]\` cannot hold index n; allocate \`n + 1\`.
- **\`List<Integer>\` for millions of primes.** Boxing costs many bytes per prime; use \`int[]\` or just count.
- **\`Math.sqrt\` with a strict \`<\`.** \`p < Math.sqrt(n)\` skips p = √n, so perfect squares like 25 survive; use \`(long) p * p <= n\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">Flags for 0..n; for each p not yet crossed, cross out its multiples; survivors are prime.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Start at p²:</strong> <span style="color:#f0e2c8;">Multiples below p·p have a smaller prime factor, so they are already crossed out.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Stop at √n:</strong> <span style="color:#f0e2c8;">Loop while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(long) p * p &lt;= n</code>: a prime above √n has nothing new to cross out, and the cast avoids <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> overflow.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n log log n) time (sum of n/p over primes), O(n) space; 193,078 crossings vs 2,745,694 trial divisions at n = 100,000.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[]</code> starts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code>, so fill it or store composite flags; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BitSet</code> for one bit per flag; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> for large bounds.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it n log log n and not n log n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prime p crosses about n/p numbers, and the sum of 1/p over primes up to x grows like log log x, because primes thin out.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">p * p</code> overflow?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At p = 46,341, the first p with p² &gt; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Integer.MAX_VALUE</code>. With n near the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> limit the loop reaches it, so compute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(long) p * p</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you save memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">java.util.BitSet</code> packs flags into bits (8 times smaller than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">boolean[]</code>), and a segmented sieve keeps only one block plus the base primes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you factorise many numbers quickly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A smallest-prime-factor sieve in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int[]</code>: set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">spf[m] = p</code> the first time m is crossed, then divide by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">spf[x]</code> repeatedly, O(log x) each.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test one large number?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Trial division up to √x in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code>, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BigInteger.isProbablePrime</code> for very large values.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prime / composite** | Exactly two divisors / more than two (0 and 1 are neither) |
| **Trial division** | Divide by every candidate up to √x |
| **Sieve of Eratosthenes** | Cross out multiples of each prime; survivors are prime |
| **p² start / √n stop** | Start crossing at p·p; stop when p·p > n |
| **O(n log log n)** | The sieve's running time, almost linear |
| **Smallest prime factor (SPF) sieve** | Store each number's smallest prime factor for fast factorisation |
| **Segmented sieve** | Sieve a window [L, R] with the primes up to √R |

---
**Conclusion:** The Sieve of Eratosthenes finds every prime up to n by crossing out the multiples of each prime instead of testing numbers one at a time; starting at p² and stopping at √n keep it at O(n log log n) time and O(n) space, against O(n√n) for trial division. In Java, remember that \`boolean[]\` starts \`false\`, guard \`p * p\` with \`long\`, and use \`BitSet\` or a segmented sieve when memory becomes the limit; the SPF variant turns the same pass into fast factorisations.`,
        examples: [
          {
            label: `Sieve up to n: primes, prime counts and work vs trial division`,
            code: `import java.util.StringJoiner;

public class Main {
    static long crossings;

    static boolean[] sieve(int n) {
        // isPrime[i] is true when i is prime. boolean[] starts all false, so fill it.
        boolean[] isPrime = new boolean[n + 1];
        for (int i = 2; i <= n; i++) isPrime[i] = true;
        crossings = 0;
        for (int p = 2; (long) p * p <= n; p++) { // long: p * p overflows int near 46341
            if (!isPrime[p]) continue;
            // start at p*p: smaller multiples of p were crossed out by smaller primes
            for (int m = p * p; m <= n; m += p) {
                isPrime[m] = false;
                crossings++;
            }
        }
        return isPrime;
    }

    static long sieveFrom2p(int n) {
        boolean[] composite = new boolean[n + 1];
        long c = 0;
        for (int p = 2; (long) p * p <= n; p++) {
            if (composite[p]) continue;
            for (int m = 2 * p; m <= n; m += p) {
                composite[m] = true;
                c++;
            }
        }
        return c;
    }

    static long[] trialDivisionWork(int n) {
        long count = 0, divisions = 0;
        for (int i = 2; i <= n; i++) {
            boolean prime = true;
            for (int d = 2; d * d <= i; d++) {
                divisions++;
                if (i % d == 0) { prime = false; break; }
            }
            if (prime) count++;
        }
        return new long[] {count, divisions};
    }

    static int countTrue(boolean[] flags) {
        int c = 0;
        for (boolean f : flags) if (f) c++;
        return c;
    }

    public static void main(String[] args) {
        boolean[] small = sieve(50);
        StringJoiner sj = new StringJoiner(", ", "[", "]");
        for (int i = 0; i <= 50; i++) if (small[i]) sj.add(String.valueOf(i));
        System.out.println("primes up to 50: " + sj);
        int n = 1;
        for (int k = 1; k <= 6; k++) {
            n *= 10;
            System.out.println("pi(" + n + ") = " + countTrue(sieve(n)));
        }

        n = 100000;
        boolean[] flags = sieve(n);
        long c = crossings;
        long[] trial = trialDivisionWork(n);
        System.out.println("n = " + n + ": " + countTrue(flags) + " primes");
        System.out.println("sieve crossings from p*p: " + c);
        System.out.println("sieve crossings from 2p:  " + sieveFrom2p(n));
        System.out.println("trial division: " + trial[0] + " primes, " + trial[1] + " divisions");
    }
}`,
          },
          {
            label: `Smallest-prime-factor sieve and a segmented sieve`,
            code: `import java.util.ArrayList;
import java.util.List;
import java.util.StringJoiner;

public class Main {
    static final int N = 10000;
    static final int[] spf = new int[N + 1]; // spf[i] = smallest prime factor of i

    static List<Integer> factorise(int x) {
        List<Integer> parts = new ArrayList<>();
        while (x > 1) {
            parts.add(spf[x]);
            x /= spf[x];
        }
        return parts;
    }

    static boolean isPrimeSlow(long v) {
        if (v < 2) return false;
        for (long d = 2; d * d <= v; d++) if (v % d == 0) return false;
        return true;
    }

    public static void main(String[] args) {
        // 1. Smallest-prime-factor sieve.
        for (int i = 0; i <= N; i++) spf[i] = i;
        for (int p = 2; p * p <= N; p++) {
            if (spf[p] != p) continue;
            for (int m = p * p; m <= N; m += p) if (spf[m] == m) spf[m] = p;
        }
        for (int x : new int[] {84, 97, 360, 1001, 9973, 8192}) {
            StringJoiner sj = new StringJoiner(" * ");
            for (int f : factorise(x)) sj.add(String.valueOf(f));
            System.out.println(x + " = " + sj);
        }

        // 2. Segmented sieve: primes in [lo, hi] without an array of size hi.
        long lo = 1000000000L, hi = 1000000100L;
        int root = (int) Math.sqrt((double) hi);
        boolean[] composite = new boolean[root + 1];
        List<Integer> basePrimes = new ArrayList<>();
        for (int p = 2; p <= root; p++) {
            if (composite[p]) continue;
            basePrimes.add(p);
            for (long m = (long) p * p; m <= root; m += p) composite[(int) m] = true;
        }
        boolean[] segComposite = new boolean[(int) (hi - lo + 1)]; // index i stands for lo + i
        for (int p : basePrimes) {
            long start = Math.max((long) p * p, (lo + p - 1) / p * p); // first multiple of p inside [lo, hi]
            for (long m = start; m <= hi; m += p) segComposite[(int) (m - lo)] = true;
        }
        List<Long> found = new ArrayList<>(), slow = new ArrayList<>();
        for (int i = 0; i <= hi - lo; i++) if (!segComposite[i]) found.add(lo + i);
        for (long v = lo; v <= hi; v++) if (isPrimeSlow(v)) slow.add(v);

        System.out.println("base primes up to " + root + ": " + basePrimes.size());
        System.out.println("primes in [" + lo + ", " + hi + "]: " + found.size());
        System.out.println("first " + found.get(0) + ", last " + found.get(found.size() - 1));
        System.out.println("agrees with trial division: " + found.equals(slow)); // equals, not ==, for lists of Long
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Explain how the Sieve of Eratosthenes finds all primes up to n, then implement it in C++. Why does the inner loop start at p squared, and what is the time complexity?"

**What a strong answer should cover:**
- The idea: mark every number as candidate prime, and for each prime p cross out its multiples; survivors are prime.
- The two optimisations: start at p² and stop once p² > n.
- O(n log log n) time vs O(n√n) for trial division on every number; O(n) space.
- Variations: smallest-prime-factor sieve for factorisation, segmented sieve for a window [L, R].
- C++ details: \`std::vector<bool>\` is a packed one-bit-per-flag specialisation (smaller, but slower access and no real references), \`std::vector<char>\` is one byte per flag, \`std::bitset<N>\` needs a compile-time size; use \`long long\` for \`p * p\` (signed overflow is undefined behaviour); \`std::sqrt\` needs an integer correction.

**Clarifying questions expected:**
- Is n inclusive, and how large can it be?
- Do you need the list, the count, or fast lookups?

**Code / implementation expected:** Yes — a sieve in C++17 with a \`std::vector\` of flags, returning the primes or their count.`,
        answer: `**Target Audience:** Developers preparing for coding interviews who know arrays and loops in C++; primes and the math are explained from scratch.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A teacher writes the numbers 2 to 100 on the board and gives the class one rule: "Circle the smallest number that is not crossed out, then cross out every multiple of it. Repeat." The first circle goes round 2, and 4, 6, 8, ... disappear. Then 3 is circled and 6, 9, 12, ... go. 4 is already crossed out, so the next circle is 5. After a few rounds, everything still standing is a prime, and nobody ever divided anything.

That classroom game is the **Sieve of Eratosthenes**, named after the Greek scholar who described it more than 2,000 years ago. It finds *all* primes up to n at once, and it does so by crossing out instead of testing, which is dramatically less work than checking each number on its own.

Interviewers ask about it because it is the standard answer to "count the primes below n" or "precompute primes for many queries", because the two small optimisations (start at p², stop at √n) test whether you understand *why* it works, and because its running time, O(n log log n), is one of the few non-obvious complexities you are expected to know.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How large is n? | The sieve needs one flag per number: 10^7 flags is about 10 MB as bytes, fine; 10^10 is not, which calls for a segmented sieve. |
| Do you want the list of primes, the count, or fast "is x prime?" lookups? | All three come from the same flag array, but the output format changes the memory you keep. |
| Is n included? ("primes up to n" vs "less than n") | An off-by-one here is the most common wrong answer. |
| Is it one number or many? | To test one number, trial division up to √x is enough; the sieve pays off when you need many primes or many queries. |
| Do you need factorisations too? | A smallest-prime-factor sieve gives every factorisation up to n in O(log x) each (section 8). |
| Is the range far from zero, like [10^9, 10^9 + 100]? | Then sieve only that window with the primes up to √R (segmented sieve). |

## 3. Primes and the Slow Way

A **prime** is a whole number greater than 1 whose only divisors are 1 and itself: 2, 3, 5, 7, 11, ... A number greater than 1 that is not prime is **composite**; 1 is neither.

📌 **Interview term: Prime / composite** — a prime has exactly two divisors, 1 and itself; a composite number (greater than 1) has more. 0 and 1 are neither.

The obvious test checks one number at a time: try dividing x by 2, 3, 4, ... and stop at √x, because if x = a · b with a ≤ b, then a ≤ √x. Doing that for every number up to n costs up to √n divisions per number, about O(n√n) in total. For n = 100,000, example 1 counts **2,745,694** divisions.

📌 **Interview term: Trial division** — testing whether x is prime by dividing it by every candidate from 2 up to √x. O(√x) for one number.

## 4. The Sieve

Instead of asking "does anything divide x?" for every x, the sieve turns the question around: "for each prime p, which numbers does p divide?" Those are just p's multiples, and you can walk them with a step of p, no division needed.

1. Make a list of flags \`is_prime[0..n]\`, all true except 0 and 1.
2. For p = 2, 3, 4, ...: if \`is_prime[p]\` is still true, p is prime; set \`is_prime[m] = false\` for every multiple m of p.
3. Whatever is still true at the end is prime.

The board for n = 30 after sieving:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="The numbers 1 to 30 after sieving: 2 3 5 7 11 13 17 19 23 29 remain as primes and every other number from 4 up is crossed out">
  <rect class="d-box" x="20" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="50" y="52" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="88" y="20" width="60" height="52" rx="8"/>
  <text class="d-text" x="118" y="52" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="156" y="20" width="60" height="52" rx="8"/>
  <text class="d-text" x="186" y="52" text-anchor="middle">3</text>
  <rect class="d-box-muted" x="224" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="254" y="52" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="292" y="20" width="60" height="52" rx="8"/>
  <text class="d-text" x="322" y="52" text-anchor="middle">5</text>
  <rect class="d-box-muted" x="360" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="390" y="52" text-anchor="middle">6</text>
  <rect class="d-box-accent" x="428" y="20" width="60" height="52" rx="8"/>
  <text class="d-text" x="458" y="52" text-anchor="middle">7</text>
  <rect class="d-box-muted" x="496" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="526" y="52" text-anchor="middle">8</text>
  <rect class="d-box-muted" x="564" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="594" y="52" text-anchor="middle">9</text>
  <rect class="d-box-muted" x="632" y="20" width="60" height="52" rx="8"/>
  <text class="d-sub" x="662" y="52" text-anchor="middle">10</text>
  <rect class="d-box-accent" x="20" y="92" width="60" height="52" rx="8"/>
  <text class="d-text" x="50" y="124" text-anchor="middle">11</text>
  <rect class="d-box-muted" x="88" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="118" y="124" text-anchor="middle">12</text>
  <rect class="d-box-accent" x="156" y="92" width="60" height="52" rx="8"/>
  <text class="d-text" x="186" y="124" text-anchor="middle">13</text>
  <rect class="d-box-muted" x="224" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="254" y="124" text-anchor="middle">14</text>
  <rect class="d-box-muted" x="292" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="322" y="124" text-anchor="middle">15</text>
  <rect class="d-box-muted" x="360" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="390" y="124" text-anchor="middle">16</text>
  <rect class="d-box-accent" x="428" y="92" width="60" height="52" rx="8"/>
  <text class="d-text" x="458" y="124" text-anchor="middle">17</text>
  <rect class="d-box-muted" x="496" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="526" y="124" text-anchor="middle">18</text>
  <rect class="d-box-accent" x="564" y="92" width="60" height="52" rx="8"/>
  <text class="d-text" x="594" y="124" text-anchor="middle">19</text>
  <rect class="d-box-muted" x="632" y="92" width="60" height="52" rx="8"/>
  <text class="d-sub" x="662" y="124" text-anchor="middle">20</text>
  <rect class="d-box-muted" x="20" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="50" y="196" text-anchor="middle">21</text>
  <rect class="d-box-muted" x="88" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="118" y="196" text-anchor="middle">22</text>
  <rect class="d-box-accent" x="156" y="164" width="60" height="52" rx="8"/>
  <text class="d-text" x="186" y="196" text-anchor="middle">23</text>
  <rect class="d-box-muted" x="224" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="254" y="196" text-anchor="middle">24</text>
  <rect class="d-box-muted" x="292" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="322" y="196" text-anchor="middle">25</text>
  <rect class="d-box-muted" x="360" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="390" y="196" text-anchor="middle">26</text>
  <rect class="d-box-muted" x="428" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="458" y="196" text-anchor="middle">27</text>
  <rect class="d-box-muted" x="496" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="526" y="196" text-anchor="middle">28</text>
  <rect class="d-box-accent" x="564" y="164" width="60" height="52" rx="8"/>
  <text class="d-text" x="594" y="196" text-anchor="middle">29</text>
  <rect class="d-box-muted" x="632" y="164" width="60" height="52" rx="8"/>
  <text class="d-sub" x="662" y="196" text-anchor="middle">30</text>
</svg>

The highlighted cells (2, 3, 5, 7, 11, 13, 17, 19, 23, 29) were never crossed out; the faded ones were crossed out as a multiple of some smaller prime. Only 2, 3 and 5 actually had to sieve, as the second optimisation below explains.

📌 **Interview term: Sieve of Eratosthenes** — find all primes up to n by crossing out the multiples of each prime in turn; the numbers never crossed out are prime.

### Optimisation 1: start crossing at p²

Every multiple of p smaller than p² is \`k · p\` with k < p, so it has a smaller prime factor and was already crossed out in an earlier round. The first multiple that is new is p · p.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 160" role="img" aria-label="Multiples of 5 up to 30: 10 and 20 and 30 were crossed by 2, 15 by 3, and 25 is the first one 5 has to cross itself">
  <rect class="d-box-muted" x="20" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="75" y="64" text-anchor="middle">10</text>
  <text class="d-sub" x="75" y="90" text-anchor="middle">done by 2</text>
  <rect class="d-box-muted" x="160" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="215" y="64" text-anchor="middle">15</text>
  <text class="d-sub" x="215" y="90" text-anchor="middle">done by 3</text>
  <rect class="d-box-muted" x="300" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="355" y="64" text-anchor="middle">20</text>
  <text class="d-sub" x="355" y="90" text-anchor="middle">done by 2</text>
  <rect class="d-box-accent" x="440" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="495" y="64" text-anchor="middle">25 = 5 x 5</text>
  <text class="d-sub" x="495" y="90" text-anchor="middle">first new one</text>
  <rect class="d-box-muted" x="580" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="635" y="64" text-anchor="middle">30</text>
  <text class="d-sub" x="635" y="90" text-anchor="middle">done by 2</text>
</svg>

When it is 5's turn, every multiple of 5 below 25 has a factor 2 or 3 and is already gone, so the inner loop starts at 25. (30 is crossed again, harmlessly: the sieve does cross some numbers more than once.)

### Optimisation 2: stop when p² > n

If p² > n, then p has nothing new to cross out (its first new multiple is beyond n). So the outer loop only runs while \`p * p <= n\`. For n = 30 only 2, 3 and 5 sieve; 7 · 7 = 49 is already past 30.

How much do they save? For n = 100,000, example 1 counts **193,078** crossings when each prime starts at p², against **202,154** when it starts at 2p. The bigger saving comes from the stopping rule, which skips all primes above √n = 316 entirely.

📌 **Interview term: p² start / √n stop** — the two standard sieve optimisations: begin crossing out at p·p, and stop the outer loop once p·p > n.

## 5. Why It Is O(n log log n)

Prime p crosses out about n / p numbers. The total work is

> n/2 + n/3 + n/5 + n/7 + ... (over primes up to √n)

and the sum of 1/p over primes up to x grows like **ln ln x**, a function that grows unbelievably slowly (ln ln 10^9 is about 3). So the sieve does O(n log log n) work in total, which for practical purposes is linear. Compare the measured counts for n = 100,000: 193,078 crossings, roughly 1.9 per number, against 2,745,694 trial divisions.

📌 **Interview term: O(n log log n)** — the running time of the sieve: n times the sum of 1/p over primes, which grows like log log n. Almost linear in practice.

The space is one flag per number, O(n). That, not time, is usually the limit: the next sections show how each language stores the flags compactly, and section 8 shows the segmented sieve that needs only O(√n) memory. See [space complexity](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use) for how to talk about that trade-off, and [Big-O notation](/interview-question/what-is-big-o-notation) for the notation itself.

## 6. The Code in C++

~~~cpp
std::vector<char> sieve(int n, long long& crossings) {
    std::vector<char> isPrime(n + 1, 1);
    isPrime[0] = 0;  // 0 and 1 are not prime
    if (n >= 1) isPrime[1] = 0;
    crossings = 0;
    for (long long p = 2; p * p <= n; p++) {  // long long: p * p must not overflow
        if (!isPrime[p]) continue;
        // start at p*p: smaller multiples of p were crossed out by smaller primes
        for (long long m = p * p; m <= n; m += p) {
            isPrime[m] = 0;
            crossings++;
        }
    }
    return isPrime;
}
~~~

The \`crossings\` counter is only there for the comparison in example 1.

**What to point out in this code:**

- **Which container for the flags?** \`std::vector<char>\` (used here) is one byte per flag with plain memory access. \`std::vector<bool>\` is a special case in the standard library: it packs flags into bits, using 8 times less memory, but each access does shifting and masking and \`operator[]\` returns a proxy object rather than a \`bool&\`. \`std::bitset<N>\` is also packed but needs N at compile time. For n up to about 10^8, \`vector<char>\` is the simple, fast choice; above that, packed bits.
- **\`long long p\`** makes \`p * p <= n\` and \`m += p\` safe for n near \`INT_MAX\`; with \`int\` both could overflow, and signed overflow is undefined behaviour.
- \`std::vector<char> isPrime(n + 1, 1)\` value-initialises all n + 1 entries to 1 in one call.
- **\`std::sqrt\` returns a double.** The segmented sieve in example 2 computes the root with \`std::sqrt\` and then corrects it with two \`while\` loops, so the integer root is exact even if the double is slightly off.
- To count primes, \`std::count(isPrime.begin(), isPrime.end(), 1)\` would work too; the example uses a simple loop.

## 7. Verified: Running the Code

Each example was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines.

**Example 1 — primes up to 50, π(n) for n = 10 to 10^6, and the work compared with trial division** prints:

~~~text
primes up to 50: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]
pi(10) = 4
pi(100) = 25
pi(1000) = 168
pi(10000) = 1229
pi(100000) = 9592
pi(1000000) = 78498
n = 100000: 9592 primes
sieve crossings from p*p: 193078
sieve crossings from 2p:  202154
trial division: 9592 primes, 2745694 divisions
~~~

π(n) is the usual name for the number of primes up to n; 78,498 primes up to a million is the well-known value. The sieve's 193,078 crossings against 2,745,694 trial divisions is the n log log n vs n√n gap.

**Example 2 — smallest-prime-factor factorisation and a segmented sieve on [10^9, 10^9 + 100]** prints:

~~~text
84 = 2 * 2 * 3 * 7
97 = 97
360 = 2 * 2 * 2 * 3 * 3 * 5
1001 = 7 * 11 * 13
9973 = 9973
8192 = 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2
base primes up to 31622: 3401
primes in [1000000000, 1000000100]: 7
first 1000000007, last 1000000097
agrees with trial division: true
~~~

The window and the trial-division list are \`std::vector<long long>\`, compared with \`==\` element by element.

## 8. Two Variations Worth Knowing

**Smallest-prime-factor (SPF) sieve.** Instead of a true/false flag, store for every number its smallest prime factor: initialise \`spf[i] = i\`, and when prime p crosses out m, set \`spf[m] = p\` if it is still \`m\`. Then any x ≤ n factorises by repeated division, \`x = spf[x] · (x / spf[x])\`, in O(log x) steps, because every step at least halves x. Example 2 factorises 360 as 2 · 2 · 2 · 3 · 3 · 5 this way.

📌 **Interview term: Smallest prime factor (SPF) sieve** — a sieve that records the smallest prime factor of every number up to n, so any of them can be factorised in O(log x).

**Segmented sieve.** To find primes in a window [L, R] far from zero (example 2 uses [1,000,000,000, 1,000,000,100]), first sieve the small primes up to √R (3,401 primes up to 31,622), then cross out their multiples inside the window only, starting at the first multiple ≥ L (and never below p²). Memory is O(√R + (R - L)) instead of O(R). The window holds 7 primes, from 1,000,000,007 to 1,000,000,097, and example 2 confirms them against trial division.

📌 **Interview term: Segmented sieve** — sieving a window [L, R] using only the primes up to √R, so memory is proportional to the window and √R rather than to R.

There is also a **linear sieve** that crosses out each composite exactly once (O(n) time), useful when you need the SPF array anyway; in interviews, the classic sieve is the expected answer.

## 9. Complexity

| Method | Time | Space | Why |
| :--- | :--- | :--- | :--- |
| Trial division, one number x | O(√x) | O(1) | divisors up to √x |
| Trial division, every number up to n | O(n√n) | O(1) | √x per number |
| **Sieve of Eratosthenes** | **O(n log log n)** | **O(n)** | n/p crossings per prime p ≤ √n |
| SPF sieve + factorise one x | O(n log log n) once, then O(log x) | O(n) | each division at least halves x |
| Segmented sieve on [L, R] | O((R - L) log log R + √R log log √R) | O(√R + R - L) | base primes, then the window |

The flag array is the real cost: n bytes as a byte array, or n/8 bytes if each flag is a single bit.

## Edge Cases

- **n < 2:** there are no primes; the code must not write \`is_prime[1]\` when the array has only one element (n = 0).
- **n = 2:** the outer loop does not run (2 · 2 > 2); the answer is [2].
- **n itself prime:** "up to n" includes n, so the array has n + 1 entries.
- **Perfect squares:** n = 25 must cross out 25, so the condition is \`p * p <= n\`, not \`<\`.
- **Overflow of p · p:** for n near the 32-bit limit, \`p * p\` overflows a 32-bit int; compute it in 64 bits.
- **Large n:** memory runs out before time does; use bits or a segmented sieve.

## Common Pitfalls

- **\`int\` overflow in \`p * p\` or \`m += p\`.** Undefined behaviour for n near \`INT_MAX\`; use \`long long\`.
- **Off-by-one on n.** \`std::vector<char> f(n)\` has no index n; allocate \`n + 1\`.
- **Taking \`bool&\` from a \`std::vector<bool>\`.** \`auto& b = flags[i];\` does not compile; the element is a proxy. Use \`vector<char>\` if you need references.
- **Trusting \`(int) std::sqrt(n)\`.** For large n the double can be one off; correct with integer checks, or loop on \`p * p <= n\`.
- **A huge \`std::bitset\` on the stack.** \`std::bitset<100000000>\` as a local variable is about 12 MB and can overflow the stack; make it static or use a vector.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Idea:</strong> <span style="color:#f0e2c8;">Flags for 0..n, all 1 except 0 and 1; for each p still 1, cross out its multiples; survivors are prime.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Start at p²:</strong> <span style="color:#f0e2c8;">Multiples below p·p have a smaller prime factor, so they are already crossed out.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Stop at √n:</strong> <span style="color:#f0e2c8;">Loop <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for (long long p = 2; p * p &lt;= n; p++)</code>: a prime above √n has nothing new to cross out.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(n log log n) time (sum of n/p over primes), O(n) space; 193,078 crossings vs 2,745,694 trial divisions at n = 100,000.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;char&gt;</code> for fast byte flags, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;bool&gt;</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::bitset</code> for packed bits; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p * p</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is it n log log n and not n log n?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prime p crosses about n/p numbers, and the sum of 1/p over primes up to x grows like log log x, because primes thin out.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">vector&lt;bool&gt;</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">vector&lt;char&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;bool&gt;</code> packs 8 flags per byte, saving memory, but each access shifts and masks and returns a proxy. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;char&gt;</code> is one byte per flag with direct access. Pick by whether memory or speed is the limit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you factorise many numbers quickly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A smallest-prime-factor sieve in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector&lt;int&gt;</code>: set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">spf[m] = p</code> the first time m is crossed, then divide by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">spf[x]</code> repeatedly, O(log x) each.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if n is 10^10?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Too many flags for memory. Sieve the base primes up to √n, then process the range in blocks that fit in cache (segmented sieve), all in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long long</code> for p?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p * p</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m += p</code> cannot overflow near <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INT_MAX</code>; signed overflow is undefined behaviour, so the compiler may break the loop condition.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Prime / composite** | Exactly two divisors / more than two (0 and 1 are neither) |
| **Trial division** | Divide by every candidate up to √x |
| **Sieve of Eratosthenes** | Cross out multiples of each prime; survivors are prime |
| **p² start / √n stop** | Start crossing at p·p; stop when p·p > n |
| **O(n log log n)** | The sieve's running time, almost linear |
| **Smallest prime factor (SPF) sieve** | Store each number's smallest prime factor for fast factorisation |
| **Segmented sieve** | Sieve a window [L, R] with the primes up to √R |

---
**Conclusion:** The Sieve of Eratosthenes finds every prime up to n by crossing out the multiples of each prime instead of testing numbers one at a time; starting at p² and stopping at √n keep it at O(n log log n) time and O(n) space, against O(n√n) for trial division. In C++, pick the flag container deliberately (\`vector<char>\` for speed, \`vector<bool>\` or \`bitset\` for packed bits), keep \`p * p\` in \`long long\`, and use the SPF or segmented variants when you need factorisations or ranges beyond memory.`,
        examples: [
          {
            label: `Sieve up to n: primes, prime counts and work vs trial division`,
            code: `#include <iostream>
#include <vector>

// std::vector<char> rather than std::vector<bool>: one byte per flag, plain memory access.
std::vector<char> sieve(int n, long long& crossings) {
    std::vector<char> isPrime(n + 1, 1);
    isPrime[0] = 0;  // 0 and 1 are not prime
    if (n >= 1) isPrime[1] = 0;
    crossings = 0;
    for (long long p = 2; p * p <= n; p++) {  // long long: p * p must not overflow
        if (!isPrime[p]) continue;
        // start at p*p: smaller multiples of p were crossed out by smaller primes
        for (long long m = p * p; m <= n; m += p) {
            isPrime[m] = 0;
            crossings++;
        }
    }
    return isPrime;
}

long long sieveFrom2p(int n) {
    std::vector<char> flags(n + 1, 1);
    long long c = 0;
    for (long long p = 2; p * p <= n; p++) {
        if (!flags[p]) continue;
        for (long long m = 2 * p; m <= n; m += p) {
            flags[m] = 0;
            c++;
        }
    }
    return c;
}

int countOnes(const std::vector<char>& flags) {
    int c = 0;
    for (char f : flags) c += f;
    return c;
}

int main() {
    long long crossings;
    std::vector<char> small = sieve(50, crossings);
    std::cout << "primes up to 50: [";
    bool first = true;
    for (int i = 0; i <= 50; i++)
        if (small[i]) {
            std::cout << (first ? "" : ", ") << i;
            first = false;
        }
    std::cout << "]\\n";
    int n = 1;
    for (int k = 1; k <= 6; k++) {
        n *= 10;
        std::cout << "pi(" << n << ") = " << countOnes(sieve(n, crossings)) << "\\n";
    }

    n = 100000;
    std::vector<char> flags = sieve(n, crossings);
    long long count = 0, divisions = 0;
    for (int i = 2; i <= n; i++) {  // trial division, for comparison
        bool prime = true;
        for (int d = 2; d * d <= i; d++) {
            divisions++;
            if (i % d == 0) { prime = false; break; }
        }
        count += prime;
    }
    std::cout << "n = " << n << ": " << countOnes(flags) << " primes\\n";
    std::cout << "sieve crossings from p*p: " << crossings << "\\n";
    std::cout << "sieve crossings from 2p:  " << sieveFrom2p(n) << "\\n";
    std::cout << "trial division: " << count << " primes, " << divisions << " divisions\\n";
}`,
          },
          {
            label: `Smallest-prime-factor sieve and a segmented sieve`,
            code: `#include <algorithm>
#include <cmath>
#include <iostream>
#include <vector>

int main() {
    // 1. Smallest-prime-factor sieve: factorise any number <= N in O(log n) divisions.
    const int N = 10000;
    std::vector<int> spf(N + 1);
    for (int i = 0; i <= N; i++) spf[i] = i;  // spf[i] = smallest prime factor of i
    for (int p = 2; p * p <= N; p++) {
        if (spf[p] != p) continue;
        for (int m = p * p; m <= N; m += p)
            if (spf[m] == m) spf[m] = p;
    }
    for (int x : {84, 97, 360, 1001, 9973, 8192}) {
        std::cout << x << " =";
        bool first = true;
        for (int v = x; v > 1; v /= spf[v]) {
            std::cout << (first ? " " : " * ") << spf[v];
            first = false;
        }
        std::cout << "\\n";
    }

    // 2. Segmented sieve: primes in [lo, hi] without an array of size hi.
    long long lo = 1000000000LL, hi = 1000000100LL;
    long long root = static_cast<long long>(std::sqrt(static_cast<double>(hi)));
    while (root * root > hi) root--;  // guard against floating-point rounding
    while ((root + 1) * (root + 1) <= hi) root++;
    std::vector<char> composite(root + 1, 0);
    std::vector<long long> basePrimes;
    for (long long p = 2; p <= root; p++) {
        if (composite[p]) continue;
        basePrimes.push_back(p);
        for (long long m = p * p; m <= root; m += p) composite[m] = 1;
    }
    std::vector<char> seg(hi - lo + 1, 1);  // seg[i] stands for lo + i
    for (long long p : basePrimes) {
        long long start = std::max(p * p, (lo + p - 1) / p * p);  // first multiple of p inside [lo, hi]
        for (long long m = start; m <= hi; m += p) seg[m - lo] = 0;
    }
    std::vector<long long> found, slow;
    for (long long i = 0; i <= hi - lo; i++)
        if (seg[i]) found.push_back(lo + i);
    for (long long v = lo; v <= hi; v++) {
        bool prime = v >= 2;
        for (long long d = 2; d * d <= v && prime; d++)
            if (v % d == 0) prime = false;
        if (prime) slow.push_back(v);
    }

    std::cout << "base primes up to " << root << ": " << basePrimes.size() << "\\n";
    std::cout << "primes in [" << lo << ", " << hi << "]: " << found.size() << "\\n";
    std::cout << "first " << found.front() << ", last " << found.back() << "\\n";
    std::cout << "agrees with trial division: " << (found == slow ? "true" : "false") << "\\n";
}`,
          },
        ],
      },
    },
  },
];

export default augments;
