/**
 * DSA ULTRA — batch 18: tries and range-query trees — what a trie is and when
 * it helps, a trie for autocomplete with '.' wildcards, segment trees (with
 * lazy propagation), and count of smaller numbers after self with a Fenwick
 * tree and coordinate compression. One complete answer per language (Python,
 * JavaScript, Java, C++). Every example was run with python3 / node /
 * javac+java / g++ -std=c++17 by scripts/verify-dsa-examples.ts and the
 * quoted output is that run's output.
 */
import type { DsaUltraAugment } from "./dsa-augments.types";

const augments: DsaUltraAugment[] = [
  {
    title: `What is a trie and when is it useful?`,
    difficulty: "medium",
    seoDescription: `What a trie (prefix tree) is, how insert, search and startsWith work, and when it beats a hash set, with verified Python, JS, Java and C++ code.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"What is a trie, and when would you use one instead of a hash set or a sorted list? Sketch the node structure and the basic operations in Python."

**What a strong answer should cover:**
- A trie stores strings one character per edge; words with a common prefix share a path, and an end-of-word flag marks complete words.
- \`insert\`, \`search\` and \`startsWith\` each cost O(L) in the word length, independent of how many words are stored, and \`search\` differs from \`startsWith\` only by the end-flag check.
- When it wins: prefix queries (autocomplete, prefix counts), wildcard search, longest-prefix match; when it loses: exact-match-only lookups, where a hash set is smaller and simpler.
- The memory trade-off: one node per distinct prefix, and per node either a fixed array (fast, wasteful) or a map (compact, slower).
- Python details: children as a \`dict\` (any character), \`__slots__\` to shrink nodes, \`dict.get\` for the walk, and \`sorted()\` because dicts keep insertion order, not alphabetical order.

**Code / implementation expected:** Optional — a \`Trie\` class with \`insert\`, \`search\` and \`startsWith\` in Python is a common follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, classes and the idea of a tree.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think about the contacts app on your phone. You type **"Ma"** and it instantly shows Maya, Mark and Martin. You type one more letter, **"Mar"**, and Maya disappears. The app is not reading through all of your 800 contacts on every key press. It behaves as if the names were filed in a cabinet of nested drawers: one drawer for every first letter, inside it a drawer for every second letter, and so on. To find everyone starting with "Mar" you open the **M** drawer, then the **a** drawer inside it, then the **r** drawer — three moves — and everything inside that last drawer is your answer.

That cabinet of nested drawers is a **trie**. The name comes from re*trie*val, and most people pronounce it "try" so that it does not sound like "tree". It is the data structure to reach for whenever a problem talks about **prefixes**: autocomplete, "does any word start with…", spell checking, or matching the longest known prefix of a string.

## 2. What a Trie Is

A trie is a tree where **each edge is one character** and **each path from the root spells out a string**. The root is empty. Words that begin the same way share the beginning of their path, so the prefix "ca" in *car*, *card*, *care* and *cat* is stored only once.

Because a path such as \`c → a → r\` could be a whole word ("car") or only the start of a longer word ("card"), every node carries a small flag that says *a word ends here*.

📌 **Interview term: Trie (prefix tree)** — a tree that stores strings letter by letter, one character per edge, so that all strings with a common prefix share one path from the root.

📌 **Interview term: Prefix** — the first k characters of a string. "ca" is a prefix of "card"; the empty string is a prefix of every string.

📌 **Interview term: End-of-word marker** — a boolean on a node (often called \`is_end\` or \`isEnd\`) that is true when the path from the root to this node is a complete inserted word, not just the start of one.

Here is the trie for the words *car, card, care, cat, dog, do*:

<svg class="iq-diagram" width="100%" viewBox="0 0 660 400" role="img" aria-label="A trie holding car, card, care, cat, dog and do. The prefix c a is stored once and shared by four words">
  <rect class="d-box-accent" x="500" y="20" width="22" height="22" rx="11"/>
  <text class="d-sub" x="532" y="36">word ends here</text>
  <path class="d-edge" d="M 330 58 L 210 112"/>
  <path class="d-edge" d="M 330 58 L 470 112"/>
  <path class="d-edge" d="M 200 150 L 200 190"/>
  <path class="d-edge" d="M 470 150 L 470 190"/>
  <path class="d-edge" d="M 190 228 L 130 272"/>
  <path class="d-edge" d="M 210 228 L 270 272"/>
  <path class="d-edge" d="M 470 228 L 470 272"/>
  <path class="d-edge" d="M 120 310 L 80 352"/>
  <path class="d-edge" d="M 140 310 L 190 352"/>
  <circle class="d-box-muted" cx="330" cy="40" r="20"/>
  <text class="d-sub" x="330" y="45" text-anchor="middle">root</text>
  <circle class="d-box" cx="200" cy="130" r="20"/>
  <text class="d-text" x="200" y="136" text-anchor="middle">c</text>
  <circle class="d-box" cx="470" cy="130" r="20"/>
  <text class="d-text" x="470" y="136" text-anchor="middle">d</text>
  <circle class="d-box" cx="200" cy="210" r="20"/>
  <text class="d-text" x="200" y="216" text-anchor="middle">a</text>
  <circle class="d-box-accent" cx="470" cy="210" r="20"/>
  <text class="d-text" x="470" y="216" text-anchor="middle">o</text>
  <circle class="d-box-accent" cx="130" cy="290" r="20"/>
  <text class="d-text" x="130" y="296" text-anchor="middle">r</text>
  <circle class="d-box-accent" cx="270" cy="290" r="20"/>
  <text class="d-text" x="270" y="296" text-anchor="middle">t</text>
  <circle class="d-box-accent" cx="470" cy="290" r="20"/>
  <text class="d-text" x="470" y="296" text-anchor="middle">g</text>
  <circle class="d-box-accent" cx="70" cy="370" r="20"/>
  <text class="d-text" x="70" y="376" text-anchor="middle">d</text>
  <circle class="d-box-accent" cx="200" cy="370" r="20"/>
  <text class="d-text" x="200" y="376" text-anchor="middle">e</text>
  <text class="d-sub" x="560" y="216">do</text>
  <text class="d-sub" x="330" y="296">cat</text>
  <text class="d-sub" x="530" y="296">dog</text>
  <text class="d-sub" x="20" y="300">car</text>
  <text class="d-sub" x="110" y="390">card</text>
  <text class="d-sub" x="240" y="390">care</text>
</svg>

The six words have 19 letters in total, but the trie needs only 9 nodes below the root, because "ca" and "d" are shared. Notice that **o** is marked as an end (for "do") even though it also has a child (for "dog"): end-of-word is a flag, not "has no children".

## 3. The Three Core Operations

Every trie question builds on three operations. All three walk down from the root one character at a time, so each costs **O(L)**, where L is the length of the word or prefix — no matter how many words the trie holds. (If [Big-O](/interview-question/what-is-big-o-notation) is new to you, read that page first.)

| Operation | What it does | Returns |
| :--- | :--- | :--- |
| \`insert(word)\` | Walk the letters; create a child when it is missing; set the end flag on the last node | nothing |
| \`search(word)\` | Walk the letters; fail if a child is missing; at the end, check the end flag | is the whole word stored? |
| \`startsWith(prefix)\` | Same walk, but **no** end-flag check | is any stored word starting with this prefix? |

The only difference between \`search\` and \`startsWith\` is that last check:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="Both search and startsWith walk the same path. search also needs the end of word flag, startsWith only needs the node to exist">
  <defs>
    <marker id="b18q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="75" width="170" height="70" rx="10"/>
  <text class="d-text" x="105" y="105" text-anchor="middle">walk c then a</text>
  <text class="d-sub" x="105" y="127" text-anchor="middle">one child per letter</text>
  <path class="d-edge" d="M 192 110 L 252 110" marker-end="url(#b18q1-arrow)"/>
  <rect class="d-box-muted" x="256" y="75" width="170" height="70" rx="10"/>
  <text class="d-text" x="341" y="105" text-anchor="middle">reached node a</text>
  <text class="d-sub" x="341" y="127" text-anchor="middle">missing child: stop</text>
  <path class="d-edge" d="M 428 95 L 486 52" marker-end="url(#b18q1-arrow)"/>
  <path class="d-edge" d="M 428 125 L 486 168" marker-end="url(#b18q1-arrow)"/>
  <rect class="d-box-accent" x="490" y="16" width="210" height="64" rx="10"/>
  <text class="d-text" x="595" y="42" text-anchor="middle">search: end flag set?</text>
  <text class="d-sub" x="595" y="64" text-anchor="middle">no, so ca is not a word</text>
  <rect class="d-box-accent" x="490" y="140" width="210" height="64" rx="10"/>
  <text class="d-text" x="595" y="166" text-anchor="middle">startsWith: node exists</text>
  <text class="d-sub" x="595" y="188" text-anchor="middle">yes, so some word starts ca</text>
</svg>

With *car, card, care, cat* stored, the walk for "ca" succeeds — node **a** exists — so \`startsWith("ca")\` is true. But nobody inserted "ca" itself, so its end flag is false and \`search("ca")\` is false.

A very useful extra is a **count on every node**: how many inserted words pass through it. Then "how many words start with this prefix?" is just the count on the node where the walk ends — still O(L), with no need to visit the subtree.

📌 **Interview term: Prefix count** — a counter stored on each trie node, incremented on every insert that passes through it, so the number of words under a prefix is read in O(L).

## 4. The Code in Python

In Python the natural choice for the children is a **\`dict\`** mapping a character to a child node. It handles any alphabet (upper case, digits, Unicode) and only stores the children that exist. The class uses \`__slots__\`, which stops Python from giving every node its own attribute dictionary; with thousands of nodes that matters.

~~~python
class TrieNode:
    __slots__ = ("children", "is_end", "count")

    def __init__(self):
        self.children = {}   # char -> TrieNode
        self.is_end = False  # a whole word ends here
        self.count = 0       # how many words pass through this node


class Trie:
    def __init__(self):
        self.root = TrieNode()
        self.nodes = 0       # nodes created, not counting the root

    def insert(self, word):
        node = self.root
        node.count += 1
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
                self.nodes += 1
            node = node.children[ch]
            node.count += 1
        node.is_end = True

    def _walk(self, s):
        node = self.root
        for ch in s:
            node = node.children.get(ch)
            if node is None:
                return None
        return node

    def search(self, word):
        node = self._walk(word)
        return node is not None and node.is_end

    def starts_with(self, prefix):
        return self._walk(prefix) is not None

    def count_prefix(self, prefix):
        node = self._walk(prefix)
        return 0 if node is None else node.count

~~~

**What to point out in this code:**

- \`_walk\` is shared by \`search\`, \`starts_with\` and \`count_prefix\`; it returns the node where the walk ends, or \`None\` as soon as a child is missing.
- \`node.children.get(ch)\` returns \`None\` for a missing key instead of raising \`KeyError\`, which keeps the walk to three lines.
- \`count\` is incremented on the root too, so \`count_prefix("")\` is the total number of inserted words (6 in the run below).
- This version counts a duplicate insert twice in \`count\`. If words may repeat, check \`is_end\` before incrementing (example 2 counts distinct words that way).
- A popular shortcut is \`node = node.children.setdefault(ch, TrieNode())\`. It works, but it builds a new \`TrieNode\` object on **every** call, even when the child already exists, and throws it away.

## 5. When Is a Trie Useful?

A trie earns its memory when the question is about **prefixes**, or when many strings share long beginnings and you look them up character by character.

| Use | Why a trie fits |
| :--- | :--- |
| Autocomplete / type-ahead | Walk the typed prefix, then list the subtree — see [Implement Trie for autocomplete — how do you handle wildcards (.)?](/interview-question/implement-trie-for-autocomplete-how-do-you-handle-wildcards) |
| "Does any word start with p?" | \`startsWith\` is O(len p); a hash set cannot answer it without scanning |
| Counting words with a prefix | A count per node answers it in O(len p) |
| Pattern search with \`.\` wildcards | Branch only where the pattern has a dot (the autocomplete page shows this) |
| Longest prefix match (IP routing tables, dictionaries) | Walk as far as possible and remember the last end-of-word node |
| Many dictionary lookups inside one text, as in [word break](/interview-question/how-do-you-solve-the-word-break-problem) | From a start position, one walk tests every dictionary word that begins there |
| [longest common prefix](/interview-question/how-do-you-find-the-longest-common-prefix-of-an-array-of-strings) of many strings | The path from the root until the first branch or end flag |

**When a trie is the wrong tool:** if you only ever ask "is this exact word present?", a [hash table](/interview-question/how-does-a-hash-table-work) does the same O(L) work with far less memory and simpler code. If you need words in sorted order with range queries but rarely prefixes, a sorted array with [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) or a balanced [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) is often enough.

| Structure | Exact lookup | Prefix query ("all words starting p") | Memory |
| :--- | :--- | :--- | :--- |
| Hash set | O(L) average | O(N · L): must test every word | one copy of each word |
| Sorted array + binary search | O(L log N) | O(L log N) to find the first match, then walk forward | one copy of each word |
| Balanced BST of strings | O(L log N) | same idea as the sorted array | one copy + tree pointers |
| Trie | O(L) | O(L) to reach the prefix node, then the size of its subtree | one node per distinct prefix; each node has child links |

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="For the prefix question a hash set must test every word, while a trie walks three letters and then reads only the matching subtree">
  <rect class="d-box-muted" x="20" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="170" y="62" text-anchor="middle">hash set: words starting abc</text>
  <text class="d-sub" x="170" y="88" text-anchor="middle">test every one of the N words</text>
  <rect class="d-box-accent" x="380" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="530" y="62" text-anchor="middle">trie: words starting abc</text>
  <text class="d-sub" x="530" y="88" text-anchor="middle">walk 3 nodes, then the subtree</text>
  <rect class="d-box" x="20" y="150" width="300" height="60" rx="10"/>
  <text class="d-text" x="170" y="186" text-anchor="middle">3776 words checked</text>
  <rect class="d-box" x="380" y="150" width="300" height="60" rx="10"/>
  <text class="d-text" x="530" y="186" text-anchor="middle">62 nodes visited</text>
  <path class="d-edge" d="M 170 112 L 170 148"/>
  <path class="d-edge" d="M 530 112 L 530 148"/>
</svg>

Example 2 below measures exactly this on 3,776 distinct random words: the hash set had to test all 3,776 words to find the 29 that start with "abc", while the trie walked 3 nodes and then 59 more in the matching subtree — 62 in total.

📌 **Interview term: Alphabet size (Σ)** — the number of different characters that can appear. It decides how children are stored: a fixed array of Σ slots, or a hash map that holds only the children that exist.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`python3 main.py\` (Python 3.13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. Example 2 builds 5,000 random words over the letters a–e with a small deterministic generator (MINSTD), so every language sees the same words.

**Example 1 — insert, search, startsWith and prefix counts on six words** prints:

~~~text
true
false
true
false
true
false
3
2
6
nodes: 9, letters inserted: 19
~~~

\`search("ca")\` is false while \`startsWith("ca")\` is true — the end-flag difference from section 3 — and the six words (19 letters) need only 9 nodes.

**Example 2 — listing words under a prefix, prefix sharing, and trie vs hash set** prints:

~~~text
prefix te -> [tea, ten, tent], nodes visited 5
prefix i  -> [i, in, inn], nodes visited 3
prefix x  -> [], nodes visited 0
distinct words 3776, letters 27461, trie nodes 7649
prefix abc: trie found 29 visiting 62 nodes
prefix abc: set scan found 29 checking 3776 words
~~~

Three things to read from this output:

- The words under a prefix come out **alphabetically** ("tea, ten, tent") because the DFS visits children in letter order and records a word before its extensions (a preorder [tree traversal](/interview-question/what-are-the-tree-traversal-methods)). "nodes visited 5" is 2 nodes to walk "te" plus 3 in its subtree.
- 3,776 distinct words with 27,461 letters (including repeats) fit in **7,649 nodes**: shared prefixes are stored once.
- For the prefix "abc", the trie visited **62** nodes; the hash set had to test all **3,776** words. Both found the same 29 words.

## 7. Complexity

L = length of the word or prefix, N = number of words, Σ = alphabet size, k = number of words returned.

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`insert\` | O(L) | one step per character |
| \`search\` / \`startsWith\` / \`countPrefix\` | O(L) | one step per character; the end flag and the count are O(1) reads |
| List all words with a prefix | O(L + size of that subtree) | walk the prefix, then visit each node below it once |
| Build from N words | O(total characters) | each character is one insert step |

| Space | Bound | Why |
| :--- | :--- | :--- |
| Nodes | at most total characters | one node per distinct prefix; shared prefixes save nodes (7,649 nodes for 27,461 letters in example 2) |
| Per node | O(Σ) with an array, O(children) with a map | the trade-off between speed and memory |

Each node is a full Python object with its own \`dict\`, so a trie of 7,649 nodes costs far more memory than the 27,461 characters it represents.

## 8. Edge Cases

- **The empty string.** \`search("")\` is false unless "" was inserted (the root end flag is false); \`startsWith("")\` is true and \`countPrefix("")\` is the total number of words (6 in example 1).
- **A word that is a prefix of another** ("do" and "dog"). The end flag on **o** is what keeps "do" findable; deleting "dog" must not clear it.
- **Duplicate inserts.** Decide whether a repeat counts twice. Example 1 counts every insert; example 2 only counts a word the first time its end flag is set.
- **A prefix that is not present** ("x", "cow"). The walk stops at the first missing child and the answer is false / zero / an empty list.
- **Characters outside the alphabet** (upper case, digits, spaces). A 26-slot array cannot hold them; a map can.

## Common Pitfalls

- **Confusing \`search\` with \`starts_with\`.** Forgetting the \`is_end\` check makes \`search("ca")\` return \`True\`.
- **Using a \`"$"\` key as the end marker in a dict-of-dicts trie** (a common short form, used in example 2). It breaks if "$" can appear in the words; a separate \`is_end\` attribute cannot collide.
- **Expecting sorted output from a dict.** Python dicts keep insertion order ([documented since Python 3.7](https://docs.python.org/3/library/stdtypes.html#dict)), not alphabetical order. Example 2 calls \`sorted()\` on the keys to list words alphabetically.
- **\`setdefault(ch, TrieNode())\` in the insert loop** builds a throw-away node on every call. Use an explicit \`if ch not in node.children\`.
- **Building \`path + ch\` strings in a deep DFS.** Every concatenation copies the string. For listing words this is fine; for very long words, keep a list of characters and \`"".join\` it only when a word ends.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">A trie is a tree of characters: each root-to-node path spells a prefix, and an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is_end</code> flag marks complete words.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The operations:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">search</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">starts_with</code> all walk one child per character, so each is O(L), independent of how many words are stored.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The difference:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">search</code> also checks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is_end</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">starts_with</code> only needs the node to exist.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When to use it:</strong> <span style="color:#f0e2c8;">Prefix questions — autocomplete, counting words with a prefix, wildcard search, longest prefix match. For exact lookups only, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set</code> is simpler and smaller.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Children in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code>, nodes with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__slots__</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted()</code> on the keys when you need alphabetical output.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">set</code> of words?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A set answers exact lookups in O(L), but "which words start with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abc</code>?" means testing every word. In our run the set checked 3776 words; the trie visited 62 nodes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you count words with a prefix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> on each node and increment it during insert; the answer is the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> of the node where the walk ends, so O(L).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you delete a word?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Walk to its last node and clear <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is_end</code>, then on the way back up remove nodes whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">children</code> dict is empty and that are not the end of another word. A recursive helper returning "can delete me" is the clean way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you return suggestions in alphabetical order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Walk to the prefix node, then a preorder DFS that visits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(node.children)</code>; preorder puts a word before its extensions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does a trie cost in memory?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One node per distinct prefix, and in Python each node is a real object with a dict. If memory is tight, store children as a sorted string plus a list, or use a sorted list of words with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect</code> for prefix ranges.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Trie (prefix tree)** | A tree of characters where words with a common prefix share a path |
| **Prefix** | The first k characters of a string |
| **End-of-word marker** | A flag on a node saying a whole inserted word ends there |
| **Prefix count** | A counter per node giving how many words pass through it |
| **Alphabet size (Σ)** | How many different characters can appear; decides array vs map children |

---
**Conclusion:** A trie is a tree of characters where shared prefixes are stored once and an \`is_end\` flag marks complete words. In Python it is a few lines with \`dict\` children: \`insert\`, \`search\` and \`starts_with\` each walk one child per character, so they cost O(L) however many words you store. Reach for it when the question is about prefixes — autocomplete, prefix counts, wildcard search — and use a plain \`set\` when you only need exact lookups; our run showed the difference, 62 trie nodes against 3,776 set checks for one prefix query.`,
        examples: [
          {
            label: `Trie basics: insert, search, startsWith, prefix counts`,
            code: `class TrieNode:
    __slots__ = ("children", "is_end", "count")

    def __init__(self):
        self.children = {}   # char -> TrieNode
        self.is_end = False  # a whole word ends here
        self.count = 0       # how many words pass through this node


class Trie:
    def __init__(self):
        self.root = TrieNode()
        self.nodes = 0       # nodes created, not counting the root

    def insert(self, word):
        node = self.root
        node.count += 1
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
                self.nodes += 1
            node = node.children[ch]
            node.count += 1
        node.is_end = True

    def _walk(self, s):
        node = self.root
        for ch in s:
            node = node.children.get(ch)
            if node is None:
                return None
        return node

    def search(self, word):
        node = self._walk(word)
        return node is not None and node.is_end

    def starts_with(self, prefix):
        return self._walk(prefix) is not None

    def count_prefix(self, prefix):
        node = self._walk(prefix)
        return 0 if node is None else node.count


def b(x):
    return str(x).lower()  # Python prints True; the other languages print true


t = Trie()
for w in ["car", "card", "care", "cat", "dog", "do"]:
    t.insert(w)

print(b(t.search("car")))  # true
print(b(t.search("ca")))  # false
print(b(t.starts_with("ca")))  # true
print(b(t.starts_with("cow")))  # false
print(b(t.search("do")))  # true
print(b(t.search("")))  # false
print(t.count_prefix("car"))  # 3
print(t.count_prefix("d"))  # 2
print(t.count_prefix(""))  # 6
print("nodes: " + str(t.nodes) + ", letters inserted: " + str(sum(len(w) for w in ["car", "card", "care", "cat", "dog", "do"])))  # nodes: 9, letters inserted: 19`,
          },
          {
            label: `Words under a prefix, prefix sharing, trie vs hash set`,
            code: `class Trie:
    def __init__(self):
        self.root = {}        # each node is a dict: char -> child dict
        self.nodes = 0
        self.words = 0

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node:
                node[ch] = {}
                self.nodes += 1
            node = node[ch]
        if "$" not in node:   # "$" marks the end of a word
            node["$"] = True
            self.words += 1

    def with_prefix(self, prefix):
        """Return (sorted words starting with prefix, nodes visited)."""
        node, visited = self.root, 0
        for ch in prefix:
            if ch not in node:
                return [], visited
            node = node[ch]
            visited += 1
        out = []

        def dfs(n, path):
            nonlocal visited
            if "$" in n:
                out.append(path)
            for ch in sorted(k for k in n if k != "$"):  # sorted: dicts keep insertion order
                visited += 1
                dfs(n[ch], path + ch)

        dfs(node, prefix)
        return out, visited


def fmt(xs):
    return "[" + ", ".join(xs) + "]"


t = Trie()
for w in ["tea", "ten", "to", "inn", "in", "tent", "i"]:
    t.insert(w)
words, seen = t.with_prefix("te")
print("prefix te -> " + fmt(words) + ", nodes visited " + str(seen))
words, seen = t.with_prefix("i")
print("prefix i  -> " + fmt(words) + ", nodes visited " + str(seen))
words, seen = t.with_prefix("x")
print("prefix x  -> " + fmt(words) + ", nodes visited " + str(seen))

# 5000 pseudo-random words over the letters a-e (MINSTD, same in every language)
seed = 7
def nxt():
    global seed
    seed = seed * 48271 % 2147483647
    return seed

big = Trie()
letters = 0
dictionary = set()
for _ in range(5000):
    w = "".join(chr(97 + nxt() % 5) for _ in range(3 + nxt() % 6))
    big.insert(w)
    dictionary.add(w)
    letters += len(w)
print("distinct words " + str(big.words) + ", letters " + str(letters) + ", trie nodes " + str(big.nodes))

found, seen = big.with_prefix("abc")
checked = 0
scan = 0
for w in dictionary:          # what a hash set has to do for a prefix question
    checked += 1
    if w.startswith("abc"):
        scan += 1
print("prefix abc: trie found " + str(len(found)) + " visiting " + str(seen) + " nodes")
print("prefix abc: set scan found " + str(scan) + " checking " + str(checked) + " words")`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"What is a trie, and when would you use one instead of a hash set or a sorted list? Sketch the node structure and the basic operations in JavaScript."

**What a strong answer should cover:**
- A trie stores strings one character per edge; words with a common prefix share a path, and an end-of-word flag marks complete words.
- \`insert\`, \`search\` and \`startsWith\` each cost O(L) in the word length, independent of how many words are stored, and \`search\` differs from \`startsWith\` only by the end-flag check.
- When it wins: prefix queries (autocomplete, prefix counts), wildcard search, longest-prefix match; when it loses: exact-match-only lookups, where a hash set is smaller and simpler.
- The memory trade-off: one node per distinct prefix, and per node either a fixed array (fast, wasteful) or a map (compact, slower).
- JavaScript details: a \`Map\` for children instead of a plain object (no prototype keys, no reordering of integer-like keys), and \`for...of\` iterating code points.

**Code / implementation expected:** Optional — a \`Trie\` class with \`insert\`, \`search\` and \`startsWith\` in JavaScript is a common follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, classes and the idea of a tree.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think about the contacts app on your phone. You type **"Ma"** and it instantly shows Maya, Mark and Martin. You type one more letter, **"Mar"**, and Maya disappears. The app is not reading through all of your 800 contacts on every key press. It behaves as if the names were filed in a cabinet of nested drawers: one drawer for every first letter, inside it a drawer for every second letter, and so on. To find everyone starting with "Mar" you open the **M** drawer, then the **a** drawer inside it, then the **r** drawer — three moves — and everything inside that last drawer is your answer.

That cabinet of nested drawers is a **trie**. The name comes from re*trie*val, and most people pronounce it "try" so that it does not sound like "tree". It is the data structure to reach for whenever a problem talks about **prefixes**: autocomplete, "does any word start with…", spell checking, or matching the longest known prefix of a string.

## 2. What a Trie Is

A trie is a tree where **each edge is one character** and **each path from the root spells out a string**. The root is empty. Words that begin the same way share the beginning of their path, so the prefix "ca" in *car*, *card*, *care* and *cat* is stored only once.

Because a path such as \`c → a → r\` could be a whole word ("car") or only the start of a longer word ("card"), every node carries a small flag that says *a word ends here*.

📌 **Interview term: Trie (prefix tree)** — a tree that stores strings letter by letter, one character per edge, so that all strings with a common prefix share one path from the root.

📌 **Interview term: Prefix** — the first k characters of a string. "ca" is a prefix of "card"; the empty string is a prefix of every string.

📌 **Interview term: End-of-word marker** — a boolean on a node (often called \`is_end\` or \`isEnd\`) that is true when the path from the root to this node is a complete inserted word, not just the start of one.

Here is the trie for the words *car, card, care, cat, dog, do*:

<svg class="iq-diagram" width="100%" viewBox="0 0 660 400" role="img" aria-label="A trie holding car, card, care, cat, dog and do. The prefix c a is stored once and shared by four words">
  <rect class="d-box-accent" x="500" y="20" width="22" height="22" rx="11"/>
  <text class="d-sub" x="532" y="36">word ends here</text>
  <path class="d-edge" d="M 330 58 L 210 112"/>
  <path class="d-edge" d="M 330 58 L 470 112"/>
  <path class="d-edge" d="M 200 150 L 200 190"/>
  <path class="d-edge" d="M 470 150 L 470 190"/>
  <path class="d-edge" d="M 190 228 L 130 272"/>
  <path class="d-edge" d="M 210 228 L 270 272"/>
  <path class="d-edge" d="M 470 228 L 470 272"/>
  <path class="d-edge" d="M 120 310 L 80 352"/>
  <path class="d-edge" d="M 140 310 L 190 352"/>
  <circle class="d-box-muted" cx="330" cy="40" r="20"/>
  <text class="d-sub" x="330" y="45" text-anchor="middle">root</text>
  <circle class="d-box" cx="200" cy="130" r="20"/>
  <text class="d-text" x="200" y="136" text-anchor="middle">c</text>
  <circle class="d-box" cx="470" cy="130" r="20"/>
  <text class="d-text" x="470" y="136" text-anchor="middle">d</text>
  <circle class="d-box" cx="200" cy="210" r="20"/>
  <text class="d-text" x="200" y="216" text-anchor="middle">a</text>
  <circle class="d-box-accent" cx="470" cy="210" r="20"/>
  <text class="d-text" x="470" y="216" text-anchor="middle">o</text>
  <circle class="d-box-accent" cx="130" cy="290" r="20"/>
  <text class="d-text" x="130" y="296" text-anchor="middle">r</text>
  <circle class="d-box-accent" cx="270" cy="290" r="20"/>
  <text class="d-text" x="270" y="296" text-anchor="middle">t</text>
  <circle class="d-box-accent" cx="470" cy="290" r="20"/>
  <text class="d-text" x="470" y="296" text-anchor="middle">g</text>
  <circle class="d-box-accent" cx="70" cy="370" r="20"/>
  <text class="d-text" x="70" y="376" text-anchor="middle">d</text>
  <circle class="d-box-accent" cx="200" cy="370" r="20"/>
  <text class="d-text" x="200" y="376" text-anchor="middle">e</text>
  <text class="d-sub" x="560" y="216">do</text>
  <text class="d-sub" x="330" y="296">cat</text>
  <text class="d-sub" x="530" y="296">dog</text>
  <text class="d-sub" x="20" y="300">car</text>
  <text class="d-sub" x="110" y="390">card</text>
  <text class="d-sub" x="240" y="390">care</text>
</svg>

The six words have 19 letters in total, but the trie needs only 9 nodes below the root, because "ca" and "d" are shared. Notice that **o** is marked as an end (for "do") even though it also has a child (for "dog"): end-of-word is a flag, not "has no children".

## 3. The Three Core Operations

Every trie question builds on three operations. All three walk down from the root one character at a time, so each costs **O(L)**, where L is the length of the word or prefix — no matter how many words the trie holds. (If [Big-O](/interview-question/what-is-big-o-notation) is new to you, read that page first.)

| Operation | What it does | Returns |
| :--- | :--- | :--- |
| \`insert(word)\` | Walk the letters; create a child when it is missing; set the end flag on the last node | nothing |
| \`search(word)\` | Walk the letters; fail if a child is missing; at the end, check the end flag | is the whole word stored? |
| \`startsWith(prefix)\` | Same walk, but **no** end-flag check | is any stored word starting with this prefix? |

The only difference between \`search\` and \`startsWith\` is that last check:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="Both search and startsWith walk the same path. search also needs the end of word flag, startsWith only needs the node to exist">
  <defs>
    <marker id="b18q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="75" width="170" height="70" rx="10"/>
  <text class="d-text" x="105" y="105" text-anchor="middle">walk c then a</text>
  <text class="d-sub" x="105" y="127" text-anchor="middle">one child per letter</text>
  <path class="d-edge" d="M 192 110 L 252 110" marker-end="url(#b18q1-arrow)"/>
  <rect class="d-box-muted" x="256" y="75" width="170" height="70" rx="10"/>
  <text class="d-text" x="341" y="105" text-anchor="middle">reached node a</text>
  <text class="d-sub" x="341" y="127" text-anchor="middle">missing child: stop</text>
  <path class="d-edge" d="M 428 95 L 486 52" marker-end="url(#b18q1-arrow)"/>
  <path class="d-edge" d="M 428 125 L 486 168" marker-end="url(#b18q1-arrow)"/>
  <rect class="d-box-accent" x="490" y="16" width="210" height="64" rx="10"/>
  <text class="d-text" x="595" y="42" text-anchor="middle">search: end flag set?</text>
  <text class="d-sub" x="595" y="64" text-anchor="middle">no, so ca is not a word</text>
  <rect class="d-box-accent" x="490" y="140" width="210" height="64" rx="10"/>
  <text class="d-text" x="595" y="166" text-anchor="middle">startsWith: node exists</text>
  <text class="d-sub" x="595" y="188" text-anchor="middle">yes, so some word starts ca</text>
</svg>

With *car, card, care, cat* stored, the walk for "ca" succeeds — node **a** exists — so \`startsWith("ca")\` is true. But nobody inserted "ca" itself, so its end flag is false and \`search("ca")\` is false.

A very useful extra is a **count on every node**: how many inserted words pass through it. Then "how many words start with this prefix?" is just the count on the node where the walk ends — still O(L), with no need to visit the subtree.

📌 **Interview term: Prefix count** — a counter stored on each trie node, incremented on every insert that passes through it, so the number of words under a prefix is read in O(L).

## 4. The Code in JavaScript

In JavaScript use a **\`Map\`** for the children, not a plain object. A \`Map\` accepts any key, has a clean \`has\`/\`get\`/\`set\` API and no inherited prototype keys. There is also an ordering trap with plain objects: integer-like keys such as \`"1"\` and \`"2"\` are listed first in ascending order, whatever order you inserted them in. Running \`const o = {}; o.b = 1; o.a = 2; o["2"] = 3; o["1"] = 4; Object.keys(o)\` printed \`[ '1', '2', 'b', 'a' ]\`, while a \`Map\` with the same insertions printed its keys in insertion order \`[ 'b', 'a', '2', '1' ]\` — MDN documents that a Map ["remembers the original insertion order of the keys"](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map).

~~~javascript
class TrieNode {
  constructor() {
    this.children = new Map(); // char -> TrieNode
    this.isEnd = false;        // a whole word ends here
    this.count = 0;            // how many words pass through this node
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
    this.nodes = 0;            // nodes created, not counting the root
  }

  insert(word) {
    let node = this.root;
    node.count++;
    for (const ch of word) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode());
        this.nodes++;
      }
      node = node.children.get(ch);
      node.count++;
    }
    node.isEnd = true;
  }

  walk(s) {
    let node = this.root;
    for (const ch of s) {
      node = node.children.get(ch);
      if (node === undefined) return null;
    }
    return node;
  }

  search(word) {
    const node = this.walk(word);
    return node !== null && node.isEnd;
  }

  startsWith(prefix) {
    return this.walk(prefix) !== null;
  }

  countPrefix(prefix) {
    const node = this.walk(prefix);
    return node === null ? 0 : node.count;
  }
}
~~~

**What to point out in this code:**

- \`walk\` is shared by \`search\`, \`startsWith\` and \`countPrefix\`; it returns the node where the walk ends, or \`null\` as soon as a child is missing.
- \`Map.prototype.get\` returns \`undefined\` for a missing key, so the walk checks \`node === undefined\`.
- \`for (const ch of word)\` iterates by **code point**, while \`word[i]\` and \`word.length\` count UTF-16 code units. For \`"a😀"\`, \`length\` is 3 but \`for…of\` runs 2 times (we ran it). With a \`Map\` this "just works" for emoji; with an index loop you would split the emoji into two halves.
- \`count\` is incremented on the root too, so \`countPrefix("")\` is the number of inserted words (6 below).

## 5. When Is a Trie Useful?

A trie earns its memory when the question is about **prefixes**, or when many strings share long beginnings and you look them up character by character.

| Use | Why a trie fits |
| :--- | :--- |
| Autocomplete / type-ahead | Walk the typed prefix, then list the subtree — see [Implement Trie for autocomplete — how do you handle wildcards (.)?](/interview-question/implement-trie-for-autocomplete-how-do-you-handle-wildcards) |
| "Does any word start with p?" | \`startsWith\` is O(len p); a hash set cannot answer it without scanning |
| Counting words with a prefix | A count per node answers it in O(len p) |
| Pattern search with \`.\` wildcards | Branch only where the pattern has a dot (the autocomplete page shows this) |
| Longest prefix match (IP routing tables, dictionaries) | Walk as far as possible and remember the last end-of-word node |
| Many dictionary lookups inside one text, as in [word break](/interview-question/how-do-you-solve-the-word-break-problem) | From a start position, one walk tests every dictionary word that begins there |
| [longest common prefix](/interview-question/how-do-you-find-the-longest-common-prefix-of-an-array-of-strings) of many strings | The path from the root until the first branch or end flag |

**When a trie is the wrong tool:** if you only ever ask "is this exact word present?", a [hash table](/interview-question/how-does-a-hash-table-work) does the same O(L) work with far less memory and simpler code. If you need words in sorted order with range queries but rarely prefixes, a sorted array with [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) or a balanced [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) is often enough.

| Structure | Exact lookup | Prefix query ("all words starting p") | Memory |
| :--- | :--- | :--- | :--- |
| Hash set | O(L) average | O(N · L): must test every word | one copy of each word |
| Sorted array + binary search | O(L log N) | O(L log N) to find the first match, then walk forward | one copy of each word |
| Balanced BST of strings | O(L log N) | same idea as the sorted array | one copy + tree pointers |
| Trie | O(L) | O(L) to reach the prefix node, then the size of its subtree | one node per distinct prefix; each node has child links |

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="For the prefix question a hash set must test every word, while a trie walks three letters and then reads only the matching subtree">
  <rect class="d-box-muted" x="20" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="170" y="62" text-anchor="middle">hash set: words starting abc</text>
  <text class="d-sub" x="170" y="88" text-anchor="middle">test every one of the N words</text>
  <rect class="d-box-accent" x="380" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="530" y="62" text-anchor="middle">trie: words starting abc</text>
  <text class="d-sub" x="530" y="88" text-anchor="middle">walk 3 nodes, then the subtree</text>
  <rect class="d-box" x="20" y="150" width="300" height="60" rx="10"/>
  <text class="d-text" x="170" y="186" text-anchor="middle">3776 words checked</text>
  <rect class="d-box" x="380" y="150" width="300" height="60" rx="10"/>
  <text class="d-text" x="530" y="186" text-anchor="middle">62 nodes visited</text>
  <path class="d-edge" d="M 170 112 L 170 148"/>
  <path class="d-edge" d="M 530 112 L 530 148"/>
</svg>

Example 2 below measures exactly this on 3,776 distinct random words: the hash set had to test all 3,776 words to find the 29 that start with "abc", while the trie walked 3 nodes and then 59 more in the matching subtree — 62 in total.

📌 **Interview term: Alphabet size (Σ)** — the number of different characters that can appear. It decides how children are stored: a fixed array of Σ slots, or a hash map that holds only the children that exist.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`node main.js\` (Node.js 22; the same file runs unchanged in the page). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. Example 2 builds 5,000 random words over the letters a–e with a small deterministic generator (MINSTD), so every language sees the same words.

**Example 1 — insert, search, startsWith and prefix counts on six words** prints:

~~~text
true
false
true
false
true
false
3
2
6
nodes: 9, letters inserted: 19
~~~

\`search("ca")\` is false while \`startsWith("ca")\` is true — the end-flag difference from section 3 — and the six words (19 letters) need only 9 nodes.

**Example 2 — listing words under a prefix, prefix sharing, and trie vs hash set** prints:

~~~text
prefix te -> [tea, ten, tent], nodes visited 5
prefix i  -> [i, in, inn], nodes visited 3
prefix x  -> [], nodes visited 0
distinct words 3776, letters 27461, trie nodes 7649
prefix abc: trie found 29 visiting 62 nodes
prefix abc: set scan found 29 checking 3776 words
~~~

Three things to read from this output:

- The words under a prefix come out **alphabetically** ("tea, ten, tent") because the DFS visits children in letter order and records a word before its extensions (a preorder [tree traversal](/interview-question/what-are-the-tree-traversal-methods)). "nodes visited 5" is 2 nodes to walk "te" plus 3 in its subtree.
- 3,776 distinct words with 27,461 letters (including repeats) fit in **7,649 nodes**: shared prefixes are stored once.
- For the prefix "abc", the trie visited **62** nodes; the hash set had to test all **3,776** words. Both found the same 29 words.

## 7. Complexity

L = length of the word or prefix, N = number of words, Σ = alphabet size, k = number of words returned.

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`insert\` | O(L) | one step per character |
| \`search\` / \`startsWith\` / \`countPrefix\` | O(L) | one step per character; the end flag and the count are O(1) reads |
| List all words with a prefix | O(L + size of that subtree) | walk the prefix, then visit each node below it once |
| Build from N words | O(total characters) | each character is one insert step |

| Space | Bound | Why |
| :--- | :--- | :--- |
| Nodes | at most total characters | one node per distinct prefix; shared prefixes save nodes (7,649 nodes for 27,461 letters in example 2) |
| Per node | O(Σ) with an array, O(children) with a map | the trade-off between speed and memory |

Each node is an object holding a \`Map\`, so a trie costs far more memory per character than the strings themselves.

## 8. Edge Cases

- **The empty string.** \`search("")\` is false unless "" was inserted (the root end flag is false); \`startsWith("")\` is true and \`countPrefix("")\` is the total number of words (6 in example 1).
- **A word that is a prefix of another** ("do" and "dog"). The end flag on **o** is what keeps "do" findable; deleting "dog" must not clear it.
- **Duplicate inserts.** Decide whether a repeat counts twice. Example 1 counts every insert; example 2 only counts a word the first time its end flag is set.
- **A prefix that is not present** ("x", "cow"). The walk stops at the first missing child and the answer is false / zero / an empty list.
- **Characters outside the alphabet** (upper case, digits, spaces). A 26-slot array cannot hold them; a map can.

## Common Pitfalls

- **Confusing \`search\` with \`startsWith\`.** Forgetting the \`isEnd\` check makes \`search("ca")\` return \`true\`.
- **Plain objects as child maps.** Integer-like keys are reordered ahead of the others, and a key such as \`"__proto__"\` behaves specially. A \`Map\` avoids both.
- **Sorting keys with the default \`sort()\`.** \`Array.prototype.sort()\` compares as strings; for single letters that is alphabetical, but for anything numeric it is not (\`[10, 9, 1].sort()\` gives \`[1, 10, 9]\`).
- **Indexing strings with \`word[i]\`** splits characters outside the Basic Multilingual Plane (emoji) into two halves; \`for…of\` does not.
- **Returning \`undefined\` instead of \`false\`.** \`node && node.isEnd\` returns \`undefined\` when the node is missing; the code uses \`node !== null && node.isEnd\` so the result is always a boolean.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">A trie is a tree of characters: each root-to-node path spells a prefix, and an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isEnd</code> flag marks complete words.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The operations:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">search</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startsWith</code> all walk one child per character, so each is O(L), independent of how many words are stored.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The difference:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">search</code> also checks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isEnd</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startsWith</code> only needs the node to exist.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When to use it:</strong> <span style="color:#f0e2c8;">Prefix questions — autocomplete, prefix counts, wildcard search, longest prefix match. For exact lookups only, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> is simpler and smaller.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Children in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> (no prototype keys, insertion order kept), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for...of</code> over the string, and an explicit sort of the keys when you need alphabetical output.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Set</code> of words?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> answers exact lookups, but "which words start with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abc</code>?" means testing every word with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startsWith</code>. In our run that was 3776 checks against 62 trie nodes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Map</code> and not a plain object for children?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Objects list integer-like keys first in numeric order and inherit prototype keys; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> keeps insertion order and only holds what you put in it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you count words with a prefix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count</code> on each node, increment it during insert, and read it at the end of the prefix walk: O(L).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you delete a word?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Clear <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isEnd</code> on its last node, then walking back up, remove a child whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> is empty and that is not the end of another word.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about emoji or accented letters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for...of</code> iterates code points, so a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>-based trie stores an emoji as one edge. Combining accents are separate code points; normalise with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">normalize()</code> if that matters.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Trie (prefix tree)** | A tree of characters where words with a common prefix share a path |
| **Prefix** | The first k characters of a string |
| **End-of-word marker** | A flag on a node saying a whole inserted word ends there |
| **Prefix count** | A counter per node giving how many words pass through it |
| **Alphabet size (Σ)** | How many different characters can appear; decides array vs map children |

---
**Conclusion:** A trie is a tree of characters where shared prefixes are stored once and an \`isEnd\` flag marks complete words. In JavaScript, build it with \`Map\` children so keys keep insertion order and no prototype keys leak in; \`insert\`, \`search\` and \`startsWith\` each walk one child per character, so they cost O(L) however many words you store. Use it for prefix questions — autocomplete, prefix counts, wildcard search — and a \`Set\` when you only need exact lookups; one prefix query cost 62 trie nodes against 3,776 \`Set\` checks in our run.`,
        examples: [
          {
            label: `Trie basics: insert, search, startsWith, prefix counts`,
            code: `class TrieNode {
  constructor() {
    this.children = new Map(); // char -> TrieNode
    this.isEnd = false;        // a whole word ends here
    this.count = 0;            // how many words pass through this node
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
    this.nodes = 0;            // nodes created, not counting the root
  }

  insert(word) {
    let node = this.root;
    node.count++;
    for (const ch of word) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode());
        this.nodes++;
      }
      node = node.children.get(ch);
      node.count++;
    }
    node.isEnd = true;
  }

  walk(s) {
    let node = this.root;
    for (const ch of s) {
      node = node.children.get(ch);
      if (node === undefined) return null;
    }
    return node;
  }

  search(word) {
    const node = this.walk(word);
    return node !== null && node.isEnd;
  }

  startsWith(prefix) {
    return this.walk(prefix) !== null;
  }

  countPrefix(prefix) {
    const node = this.walk(prefix);
    return node === null ? 0 : node.count;
  }
}

const words = ["car", "card", "care", "cat", "dog", "do"];
const t = new Trie();
for (const w of words) t.insert(w);

console.log(t.search("car")); // true
console.log(t.search("ca")); // false
console.log(t.startsWith("ca")); // true
console.log(t.startsWith("cow")); // false
console.log(t.search("do")); // true
console.log(t.search("")); // false
console.log(t.countPrefix("car")); // 3
console.log(t.countPrefix("d")); // 2
console.log(t.countPrefix("")); // 6
console.log("nodes: " + t.nodes + ", letters inserted: " + words.reduce((s, w) => s + w.length, 0)); // nodes: 9, letters inserted: 19`,
          },
          {
            label: `Words under a prefix, prefix sharing, trie vs hash set`,
            code: `class Trie {
  constructor() {
    this.root = new Map(); // each node is a Map: char -> child Map, "$" marks a word end
    this.nodes = 0;
    this.words = 0;
  }

  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.has(ch)) {
        node.set(ch, new Map());
        this.nodes++;
      }
      node = node.get(ch);
    }
    if (!node.has("$")) {
      node.set("$", true);
      this.words++;
    }
  }

  withPrefix(prefix) {
    let node = this.root;
    let visited = 0;
    for (const ch of prefix) {
      if (!node.has(ch)) return { words: [], visited };
      node = node.get(ch);
      visited++;
    }
    const out = [];
    const dfs = (n, path) => {
      if (n.has("$")) out.push(path);
      const keys = [...n.keys()].filter((k) => k !== "$").sort(); // Map keeps insertion order
      for (const ch of keys) {
        visited++;
        dfs(n.get(ch), path + ch);
      }
    };
    dfs(node, prefix);
    return { words: out, visited };
  }
}

const fmt = (xs) => "[" + xs.join(", ") + "]";

const t = new Trie();
for (const w of ["tea", "ten", "to", "inn", "in", "tent", "i"]) t.insert(w);
let r = t.withPrefix("te");
console.log("prefix te -> " + fmt(r.words) + ", nodes visited " + r.visited);
r = t.withPrefix("i");
console.log("prefix i  -> " + fmt(r.words) + ", nodes visited " + r.visited);
r = t.withPrefix("x");
console.log("prefix x  -> " + fmt(r.words) + ", nodes visited " + r.visited);

// 5000 pseudo-random words over the letters a-e (MINSTD, same in every language)
let seed = 7;
const nxt = () => (seed = (seed * 48271) % 2147483647);

const big = new Trie();
const dictionary = new Set();
let letters = 0;
for (let i = 0; i < 5000; i++) {
  const len = 3 + (nxt() % 6);
  let w = "";
  for (let j = 0; j < len; j++) w += String.fromCharCode(97 + (nxt() % 5));
  big.insert(w);
  dictionary.add(w);
  letters += w.length;
}
console.log("distinct words " + big.words + ", letters " + letters + ", trie nodes " + big.nodes);

r = big.withPrefix("abc");
let checked = 0;
let scan = 0;
for (const w of dictionary) { // what a hash set has to do for a prefix question
  checked++;
  if (w.startsWith("abc")) scan++;
}
console.log("prefix abc: trie found " + r.words.length + " visiting " + r.visited + " nodes");
console.log("prefix abc: set scan found " + scan + " checking " + checked + " words");`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"What is a trie, and when would you use one instead of a hash set or a sorted list? Sketch the node structure and the basic operations in Java."

**What a strong answer should cover:**
- A trie stores strings one character per edge; words with a common prefix share a path, and an end-of-word flag marks complete words.
- \`insert\`, \`search\` and \`startsWith\` each cost O(L) in the word length, independent of how many words are stored, and \`search\` differs from \`startsWith\` only by the end-flag check.
- When it wins: prefix queries (autocomplete, prefix counts), wildcard search, longest-prefix match; when it loses: exact-match-only lookups, where a hash set is smaller and simpler.
- The memory trade-off: one node per distinct prefix, and per node either a fixed array (fast, wasteful) or a map (compact, slower).
- Java details: \`TrieNode[26]\` indexed by \`ch - 'a'\` vs \`HashMap<Character, TrieNode>\` (boxing, no order), and the exception on characters outside a–z.

**Code / implementation expected:** Optional — a \`Trie\` class with \`insert\`, \`search\` and \`startsWith\` in Java is a common follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, classes and the idea of a tree.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think about the contacts app on your phone. You type **"Ma"** and it instantly shows Maya, Mark and Martin. You type one more letter, **"Mar"**, and Maya disappears. The app is not reading through all of your 800 contacts on every key press. It behaves as if the names were filed in a cabinet of nested drawers: one drawer for every first letter, inside it a drawer for every second letter, and so on. To find everyone starting with "Mar" you open the **M** drawer, then the **a** drawer inside it, then the **r** drawer — three moves — and everything inside that last drawer is your answer.

That cabinet of nested drawers is a **trie**. The name comes from re*trie*val, and most people pronounce it "try" so that it does not sound like "tree". It is the data structure to reach for whenever a problem talks about **prefixes**: autocomplete, "does any word start with…", spell checking, or matching the longest known prefix of a string.

## 2. What a Trie Is

A trie is a tree where **each edge is one character** and **each path from the root spells out a string**. The root is empty. Words that begin the same way share the beginning of their path, so the prefix "ca" in *car*, *card*, *care* and *cat* is stored only once.

Because a path such as \`c → a → r\` could be a whole word ("car") or only the start of a longer word ("card"), every node carries a small flag that says *a word ends here*.

📌 **Interview term: Trie (prefix tree)** — a tree that stores strings letter by letter, one character per edge, so that all strings with a common prefix share one path from the root.

📌 **Interview term: Prefix** — the first k characters of a string. "ca" is a prefix of "card"; the empty string is a prefix of every string.

📌 **Interview term: End-of-word marker** — a boolean on a node (often called \`is_end\` or \`isEnd\`) that is true when the path from the root to this node is a complete inserted word, not just the start of one.

Here is the trie for the words *car, card, care, cat, dog, do*:

<svg class="iq-diagram" width="100%" viewBox="0 0 660 400" role="img" aria-label="A trie holding car, card, care, cat, dog and do. The prefix c a is stored once and shared by four words">
  <rect class="d-box-accent" x="500" y="20" width="22" height="22" rx="11"/>
  <text class="d-sub" x="532" y="36">word ends here</text>
  <path class="d-edge" d="M 330 58 L 210 112"/>
  <path class="d-edge" d="M 330 58 L 470 112"/>
  <path class="d-edge" d="M 200 150 L 200 190"/>
  <path class="d-edge" d="M 470 150 L 470 190"/>
  <path class="d-edge" d="M 190 228 L 130 272"/>
  <path class="d-edge" d="M 210 228 L 270 272"/>
  <path class="d-edge" d="M 470 228 L 470 272"/>
  <path class="d-edge" d="M 120 310 L 80 352"/>
  <path class="d-edge" d="M 140 310 L 190 352"/>
  <circle class="d-box-muted" cx="330" cy="40" r="20"/>
  <text class="d-sub" x="330" y="45" text-anchor="middle">root</text>
  <circle class="d-box" cx="200" cy="130" r="20"/>
  <text class="d-text" x="200" y="136" text-anchor="middle">c</text>
  <circle class="d-box" cx="470" cy="130" r="20"/>
  <text class="d-text" x="470" y="136" text-anchor="middle">d</text>
  <circle class="d-box" cx="200" cy="210" r="20"/>
  <text class="d-text" x="200" y="216" text-anchor="middle">a</text>
  <circle class="d-box-accent" cx="470" cy="210" r="20"/>
  <text class="d-text" x="470" y="216" text-anchor="middle">o</text>
  <circle class="d-box-accent" cx="130" cy="290" r="20"/>
  <text class="d-text" x="130" y="296" text-anchor="middle">r</text>
  <circle class="d-box-accent" cx="270" cy="290" r="20"/>
  <text class="d-text" x="270" y="296" text-anchor="middle">t</text>
  <circle class="d-box-accent" cx="470" cy="290" r="20"/>
  <text class="d-text" x="470" y="296" text-anchor="middle">g</text>
  <circle class="d-box-accent" cx="70" cy="370" r="20"/>
  <text class="d-text" x="70" y="376" text-anchor="middle">d</text>
  <circle class="d-box-accent" cx="200" cy="370" r="20"/>
  <text class="d-text" x="200" y="376" text-anchor="middle">e</text>
  <text class="d-sub" x="560" y="216">do</text>
  <text class="d-sub" x="330" y="296">cat</text>
  <text class="d-sub" x="530" y="296">dog</text>
  <text class="d-sub" x="20" y="300">car</text>
  <text class="d-sub" x="110" y="390">card</text>
  <text class="d-sub" x="240" y="390">care</text>
</svg>

The six words have 19 letters in total, but the trie needs only 9 nodes below the root, because "ca" and "d" are shared. Notice that **o** is marked as an end (for "do") even though it also has a child (for "dog"): end-of-word is a flag, not "has no children".

## 3. The Three Core Operations

Every trie question builds on three operations. All three walk down from the root one character at a time, so each costs **O(L)**, where L is the length of the word or prefix — no matter how many words the trie holds. (If [Big-O](/interview-question/what-is-big-o-notation) is new to you, read that page first.)

| Operation | What it does | Returns |
| :--- | :--- | :--- |
| \`insert(word)\` | Walk the letters; create a child when it is missing; set the end flag on the last node | nothing |
| \`search(word)\` | Walk the letters; fail if a child is missing; at the end, check the end flag | is the whole word stored? |
| \`startsWith(prefix)\` | Same walk, but **no** end-flag check | is any stored word starting with this prefix? |

The only difference between \`search\` and \`startsWith\` is that last check:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="Both search and startsWith walk the same path. search also needs the end of word flag, startsWith only needs the node to exist">
  <defs>
    <marker id="b18q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="75" width="170" height="70" rx="10"/>
  <text class="d-text" x="105" y="105" text-anchor="middle">walk c then a</text>
  <text class="d-sub" x="105" y="127" text-anchor="middle">one child per letter</text>
  <path class="d-edge" d="M 192 110 L 252 110" marker-end="url(#b18q1-arrow)"/>
  <rect class="d-box-muted" x="256" y="75" width="170" height="70" rx="10"/>
  <text class="d-text" x="341" y="105" text-anchor="middle">reached node a</text>
  <text class="d-sub" x="341" y="127" text-anchor="middle">missing child: stop</text>
  <path class="d-edge" d="M 428 95 L 486 52" marker-end="url(#b18q1-arrow)"/>
  <path class="d-edge" d="M 428 125 L 486 168" marker-end="url(#b18q1-arrow)"/>
  <rect class="d-box-accent" x="490" y="16" width="210" height="64" rx="10"/>
  <text class="d-text" x="595" y="42" text-anchor="middle">search: end flag set?</text>
  <text class="d-sub" x="595" y="64" text-anchor="middle">no, so ca is not a word</text>
  <rect class="d-box-accent" x="490" y="140" width="210" height="64" rx="10"/>
  <text class="d-text" x="595" y="166" text-anchor="middle">startsWith: node exists</text>
  <text class="d-sub" x="595" y="188" text-anchor="middle">yes, so some word starts ca</text>
</svg>

With *car, card, care, cat* stored, the walk for "ca" succeeds — node **a** exists — so \`startsWith("ca")\` is true. But nobody inserted "ca" itself, so its end flag is false and \`search("ca")\` is false.

A very useful extra is a **count on every node**: how many inserted words pass through it. Then "how many words start with this prefix?" is just the count on the node where the walk ends — still O(L), with no need to visit the subtree.

📌 **Interview term: Prefix count** — a counter stored on each trie node, incremented on every insert that passes through it, so the number of words under a prefix is read in O(L).

## 4. The Code in Java

In Java the classic interview choice is a fixed **array of 26 children**, \`TrieNode[] children = new TrieNode[26]\`, indexed by \`ch - 'a'\`. That expression is an \`int\` (a \`char\` minus a \`char\` is promoted to \`int\`), so \`'c' - 'a'\` is 2. The array is fast and needs no boxing, and its index order is alphabetical order for free. The cost is 26 references per node even when most are \`null\`, and it only works for the letters a–z. For a larger alphabet use \`HashMap<Character, TrieNode>\` (each \`char\` is boxed into a \`Character\`) or \`TreeMap\` if you need sorted children.

~~~java
static class TrieNode {
    TrieNode[] children = new TrieNode[26]; // index = letter - 'a'
    boolean isEnd;                          // a whole word ends here
    int count;                              // words passing through this node
}

static class Trie {
    TrieNode root = new TrieNode();
    int nodes = 0;                          // nodes created, not counting the root

    void insert(String word) {
        TrieNode node = root;
        node.count++;
        for (int i = 0; i < word.length(); i++) {
            int c = word.charAt(i) - 'a';
            if (node.children[c] == null) {
                node.children[c] = new TrieNode();
                nodes++;
            }
            node = node.children[c];
            node.count++;
        }
        node.isEnd = true;
    }

    TrieNode walk(String s) {
        TrieNode node = root;
        for (int i = 0; i < s.length() && node != null; i++) {
            node = node.children[s.charAt(i) - 'a'];
        }
        return node;
    }

    boolean search(String word) {
        TrieNode node = walk(word);
        return node != null && node.isEnd;
    }

    boolean startsWith(String prefix) {
        return walk(prefix) != null;
    }

    int countPrefix(String prefix) {
        TrieNode node = walk(prefix);
        return node == null ? 0 : node.count;
    }
}
~~~

**What to point out in this code:**

- \`walk\` is shared by \`search\`, \`startsWith\` and \`countPrefix\`; the loop condition \`node != null\` stops as soon as a child is missing.
- \`word.charAt(i) - 'a'\` turns a letter into an array index. An upper-case letter or a digit gives a negative or too-large index and throws \`ArrayIndexOutOfBoundsException\` — validate or lower-case the input first.
- \`boolean isEnd\` and \`int count\` need no initialiser: Java fields default to \`false\` and \`0\`, and array slots default to \`null\`.
- \`count\` is incremented on the root too, so \`countPrefix("")\` is the number of inserted words (6 below).

## 5. When Is a Trie Useful?

A trie earns its memory when the question is about **prefixes**, or when many strings share long beginnings and you look them up character by character.

| Use | Why a trie fits |
| :--- | :--- |
| Autocomplete / type-ahead | Walk the typed prefix, then list the subtree — see [Implement Trie for autocomplete — how do you handle wildcards (.)?](/interview-question/implement-trie-for-autocomplete-how-do-you-handle-wildcards) |
| "Does any word start with p?" | \`startsWith\` is O(len p); a hash set cannot answer it without scanning |
| Counting words with a prefix | A count per node answers it in O(len p) |
| Pattern search with \`.\` wildcards | Branch only where the pattern has a dot (the autocomplete page shows this) |
| Longest prefix match (IP routing tables, dictionaries) | Walk as far as possible and remember the last end-of-word node |
| Many dictionary lookups inside one text, as in [word break](/interview-question/how-do-you-solve-the-word-break-problem) | From a start position, one walk tests every dictionary word that begins there |
| [longest common prefix](/interview-question/how-do-you-find-the-longest-common-prefix-of-an-array-of-strings) of many strings | The path from the root until the first branch or end flag |

**When a trie is the wrong tool:** if you only ever ask "is this exact word present?", a [hash table](/interview-question/how-does-a-hash-table-work) does the same O(L) work with far less memory and simpler code. If you need words in sorted order with range queries but rarely prefixes, a sorted array with [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) or a balanced [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) is often enough.

| Structure | Exact lookup | Prefix query ("all words starting p") | Memory |
| :--- | :--- | :--- | :--- |
| Hash set | O(L) average | O(N · L): must test every word | one copy of each word |
| Sorted array + binary search | O(L log N) | O(L log N) to find the first match, then walk forward | one copy of each word |
| Balanced BST of strings | O(L log N) | same idea as the sorted array | one copy + tree pointers |
| Trie | O(L) | O(L) to reach the prefix node, then the size of its subtree | one node per distinct prefix; each node has child links |

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="For the prefix question a hash set must test every word, while a trie walks three letters and then reads only the matching subtree">
  <rect class="d-box-muted" x="20" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="170" y="62" text-anchor="middle">hash set: words starting abc</text>
  <text class="d-sub" x="170" y="88" text-anchor="middle">test every one of the N words</text>
  <rect class="d-box-accent" x="380" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="530" y="62" text-anchor="middle">trie: words starting abc</text>
  <text class="d-sub" x="530" y="88" text-anchor="middle">walk 3 nodes, then the subtree</text>
  <rect class="d-box" x="20" y="150" width="300" height="60" rx="10"/>
  <text class="d-text" x="170" y="186" text-anchor="middle">3776 words checked</text>
  <rect class="d-box" x="380" y="150" width="300" height="60" rx="10"/>
  <text class="d-text" x="530" y="186" text-anchor="middle">62 nodes visited</text>
  <path class="d-edge" d="M 170 112 L 170 148"/>
  <path class="d-edge" d="M 530 112 L 530 148"/>
</svg>

Example 2 below measures exactly this on 3,776 distinct random words: the hash set had to test all 3,776 words to find the 29 that start with "abc", while the trie walked 3 nodes and then 59 more in the matching subtree — 62 in total.

📌 **Interview term: Alphabet size (Σ)** — the number of different characters that can appear. It decides how children are stored: a fixed array of Σ slots, or a hash map that holds only the children that exist.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`javac Main.java && java Main\` (JDK 21, compiled as Java 17+ source). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. Example 2 builds 5,000 random words over the letters a–e with a small deterministic generator (MINSTD), so every language sees the same words.

**Example 1 — insert, search, startsWith and prefix counts on six words** prints:

~~~text
true
false
true
false
true
false
3
2
6
nodes: 9, letters inserted: 19
~~~

\`search("ca")\` is false while \`startsWith("ca")\` is true — the end-flag difference from section 3 — and the six words (19 letters) need only 9 nodes.

**Example 2 — listing words under a prefix, prefix sharing, and trie vs hash set** prints:

~~~text
prefix te -> [tea, ten, tent], nodes visited 5
prefix i  -> [i, in, inn], nodes visited 3
prefix x  -> [], nodes visited 0
distinct words 3776, letters 27461, trie nodes 7649
prefix abc: trie found 29 visiting 62 nodes
prefix abc: set scan found 29 checking 3776 words
~~~

Three things to read from this output:

- The words under a prefix come out **alphabetically** ("tea, ten, tent") because the DFS visits children in letter order and records a word before its extensions (a preorder [tree traversal](/interview-question/what-are-the-tree-traversal-methods)). "nodes visited 5" is 2 nodes to walk "te" plus 3 in its subtree.
- 3,776 distinct words with 27,461 letters (including repeats) fit in **7,649 nodes**: shared prefixes are stored once.
- For the prefix "abc", the trie visited **62** nodes; the hash set had to test all **3,776** words. Both found the same 29 words.

## 7. Complexity

L = length of the word or prefix, N = number of words, Σ = alphabet size, k = number of words returned.

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`insert\` | O(L) | one step per character |
| \`search\` / \`startsWith\` / \`countPrefix\` | O(L) | one step per character; the end flag and the count are O(1) reads |
| List all words with a prefix | O(L + size of that subtree) | walk the prefix, then visit each node below it once |
| Build from N words | O(total characters) | each character is one insert step |

| Space | Bound | Why |
| :--- | :--- | :--- |
| Nodes | at most total characters | one node per distinct prefix; shared prefixes save nodes (7,649 nodes for 27,461 letters in example 2) |
| Per node | O(Σ) with an array, O(children) with a map | the trade-off between speed and memory |

With 26-slot arrays every node holds 26 references even if it has one child: 7,649 nodes means 198,874 slots, most of them \`null\`.

## 8. Edge Cases

- **The empty string.** \`search("")\` is false unless "" was inserted (the root end flag is false); \`startsWith("")\` is true and \`countPrefix("")\` is the total number of words (6 in example 1).
- **A word that is a prefix of another** ("do" and "dog"). The end flag on **o** is what keeps "do" findable; deleting "dog" must not clear it.
- **Duplicate inserts.** Decide whether a repeat counts twice. Example 1 counts every insert; example 2 only counts a word the first time its end flag is set.
- **A prefix that is not present** ("x", "cow"). The walk stops at the first missing child and the answer is false / zero / an empty list.
- **Characters outside the alphabet** (upper case, digits, spaces). A 26-slot array cannot hold them; a map can.

## Common Pitfalls

- **Confusing \`search\` with \`startsWith\`.** Forgetting the \`isEnd\` check makes \`search("ca")\` return \`true\`.
- **\`ch - 'a'\` on input that is not lower-case a–z** throws \`ArrayIndexOutOfBoundsException\`. Normalise with \`toLowerCase()\` or switch to a map.
- **\`HashMap\` children and sorted output.** The \`HashMap\` documentation says it ["makes no guarantees as to the order of the map"](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/HashMap.html). Use the 26-slot array or a \`TreeMap\` when you need words in alphabetical order.
- **String concatenation inside the DFS.** \`path + c\` creates a new \`String\` every step. Example 2 uses one \`StringBuilder\` and removes the last character after each child (backtracking).
- **Recursion depth.** A recursive DFS over a trie is as deep as the longest word. That is fine for words; for strings of hundreds of thousands of characters, use an explicit stack.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">A trie is a tree of characters: each root-to-node path spells a prefix, and an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isEnd</code> flag marks complete words.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The operations:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">search</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startsWith</code> all walk one child per character, so each is O(L), independent of how many words are stored.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The difference:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">search</code> also checks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isEnd</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startsWith</code> only needs the node to exist.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When to use it:</strong> <span style="color:#f0e2c8;">Prefix questions — autocomplete, prefix counts, wildcard search, longest prefix match. For exact lookups only, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashSet</code> is simpler and smaller.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TrieNode[26]</code> indexed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ch - 'a'</code> for lower-case letters — fast and alphabetical; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Character, TrieNode&gt;</code> for larger alphabets, at the cost of boxing.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashSet&lt;String&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It answers exact lookups, but a prefix query must call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startsWith</code> on every word. In our run that was 3776 checks against 62 trie nodes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Array of 26 or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The array is faster and alphabetical but spends 26 references per node; the map holds only existing children but boxes each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">char</code> and has no order. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeMap</code> gives order with O(log Σ) lookups.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you count words with a prefix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int count</code> per node, incremented during insert; read it at the end of the walk: O(L).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you delete a word?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recursive helper: clear <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isEnd</code> at the last node, and on the way back set a child slot to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> when that child has no children and is not a word end.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with an upper-case letter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">'C' - 'a'</code> is negative, so the array access throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayIndexOutOfBoundsException</code>. Lower-case the input or validate it before walking.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Trie (prefix tree)** | A tree of characters where words with a common prefix share a path |
| **Prefix** | The first k characters of a string |
| **End-of-word marker** | A flag on a node saying a whole inserted word ends there |
| **Prefix count** | A counter per node giving how many words pass through it |
| **Alphabet size (Σ)** | How many different characters can appear; decides array vs map children |

---
**Conclusion:** A trie is a tree of characters where shared prefixes are stored once and an \`isEnd\` flag marks complete words. In Java the interview version uses \`TrieNode[26]\` indexed by \`ch - 'a'\`, which is fast and alphabetical but limited to a–z and heavy on memory; a \`HashMap\` covers any alphabet. \`insert\`, \`search\` and \`startsWith\` each cost O(L) however many words you store, which makes the trie the right tool for prefix questions and a \`HashSet\` the right tool for exact lookups only.`,
        examples: [
          {
            label: `Trie basics: insert, search, startsWith, prefix counts`,
            code: `public class Main {
    static class TrieNode {
        TrieNode[] children = new TrieNode[26]; // index = letter - 'a'
        boolean isEnd;                          // a whole word ends here
        int count;                              // words passing through this node
    }

    static class Trie {
        TrieNode root = new TrieNode();
        int nodes = 0;                          // nodes created, not counting the root

        void insert(String word) {
            TrieNode node = root;
            node.count++;
            for (int i = 0; i < word.length(); i++) {
                int c = word.charAt(i) - 'a';
                if (node.children[c] == null) {
                    node.children[c] = new TrieNode();
                    nodes++;
                }
                node = node.children[c];
                node.count++;
            }
            node.isEnd = true;
        }

        TrieNode walk(String s) {
            TrieNode node = root;
            for (int i = 0; i < s.length() && node != null; i++) {
                node = node.children[s.charAt(i) - 'a'];
            }
            return node;
        }

        boolean search(String word) {
            TrieNode node = walk(word);
            return node != null && node.isEnd;
        }

        boolean startsWith(String prefix) {
            return walk(prefix) != null;
        }

        int countPrefix(String prefix) {
            TrieNode node = walk(prefix);
            return node == null ? 0 : node.count;
        }
    }

    public static void main(String[] args) {
        String[] words = {"car", "card", "care", "cat", "dog", "do"};
        Trie t = new Trie();
        int letters = 0;
        for (String w : words) {
            t.insert(w);
            letters += w.length();
        }
        System.out.println(t.search("car"));       // true
        System.out.println(t.search("ca"));        // false
        System.out.println(t.startsWith("ca"));    // true
        System.out.println(t.startsWith("cow"));   // false
        System.out.println(t.search("do"));        // true
        System.out.println(t.search(""));          // false
        System.out.println(t.countPrefix("car"));  // 3
        System.out.println(t.countPrefix("d"));    // 2
        System.out.println(t.countPrefix(""));     // 6
        System.out.println("nodes: " + t.nodes + ", letters inserted: " + letters); // nodes: 9, letters inserted: 19
    }
}`,
          },
          {
            label: `Words under a prefix, prefix sharing, trie vs hash set`,
            code: `import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class Main {
    static class Node {
        Node[] next = new Node[26]; // array children: index order is alphabetical order
        boolean isEnd;
    }

    static Node root = new Node();
    static int nodes = 0, words = 0, visited = 0;

    static void insert(Node r, String w) {
        Node node = r;
        for (char ch : w.toCharArray()) {
            if (node.next[ch - 'a'] == null) {
                node.next[ch - 'a'] = new Node();
                nodes++;
            }
            node = node.next[ch - 'a'];
        }
        if (!node.isEnd) {
            node.isEnd = true;
            words++;
        }
    }

    static List<String> withPrefix(Node r, String prefix) {
        visited = 0;
        List<String> out = new ArrayList<>();
        Node node = r;
        for (char ch : prefix.toCharArray()) {
            node = node.next[ch - 'a'];
            if (node == null) return out;
            visited++;
        }
        dfs(node, new StringBuilder(prefix), out);
        return out;
    }

    static void dfs(Node n, StringBuilder path, List<String> out) {
        if (n.isEnd) out.add(path.toString());
        for (int c = 0; c < 26; c++) {
            if (n.next[c] == null) continue;
            visited++;
            path.append((char) ('a' + c));
            dfs(n.next[c], path, out);
            path.deleteCharAt(path.length() - 1); // undo: one shared builder, no copies
        }
    }

    static long seed = 7;
    static int nxt() {
        seed = seed * 48271 % 2147483647L;
        return (int) seed;
    }

    public static void main(String[] args) {
        Node small = new Node();
        for (String w : new String[]{"tea", "ten", "to", "inn", "in", "tent", "i"}) insert(small, w);
        List<String> r = withPrefix(small, "te");
        System.out.println("prefix te -> [" + String.join(", ", r) + "], nodes visited " + visited);
        r = withPrefix(small, "i");
        System.out.println("prefix i  -> [" + String.join(", ", r) + "], nodes visited " + visited);
        r = withPrefix(small, "x");
        System.out.println("prefix x  -> [" + String.join(", ", r) + "], nodes visited " + visited);

        nodes = 0;
        words = 0;
        Set<String> dictionary = new HashSet<>();
        int letters = 0;
        for (int i = 0; i < 5000; i++) {
            int len = 3 + nxt() % 6;
            StringBuilder sb = new StringBuilder();
            for (int j = 0; j < len; j++) sb.append((char) ('a' + nxt() % 5));
            String w = sb.toString();
            insert(root, w);
            dictionary.add(w);
            letters += w.length();
        }
        System.out.println("distinct words " + words + ", letters " + letters + ", trie nodes " + nodes);

        r = withPrefix(root, "abc");
        int checked = 0, scan = 0;
        for (String w : dictionary) { // what a hash set has to do for a prefix question
            checked++;
            if (w.startsWith("abc")) scan++;
        }
        System.out.println("prefix abc: trie found " + r.size() + " visiting " + visited + " nodes");
        System.out.println("prefix abc: set scan found " + scan + " checking " + checked + " words");
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"What is a trie, and when would you use one instead of a hash set or a sorted list? Sketch the node structure and the basic operations in C++."

**What a strong answer should cover:**
- A trie stores strings one character per edge; words with a common prefix share a path, and an end-of-word flag marks complete words.
- \`insert\`, \`search\` and \`startsWith\` each cost O(L) in the word length, independent of how many words are stored, and \`search\` differs from \`startsWith\` only by the end-flag check.
- When it wins: prefix queries (autocomplete, prefix counts), wildcard search, longest-prefix match; when it loses: exact-match-only lookups, where a hash set is smaller and simpler.
- The memory trade-off: one node per distinct prefix, and per node either a fixed array (fast, wasteful) or a map (compact, slower).
- C++ details: \`std::array<std::unique_ptr<TrieNode>, 26>\` for automatic cleanup, the undefined behaviour of \`ch - 'a'\` on other characters, and \`const\` lookups.

**Code / implementation expected:** Optional — a \`Trie\` class with \`insert\`, \`search\` and \`startsWith\` in C++ is a common follow-up.`,
        answer: `**Target Audience:** Beginners preparing for coding interviews — you need loops, classes and the idea of a tree.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

Think about the contacts app on your phone. You type **"Ma"** and it instantly shows Maya, Mark and Martin. You type one more letter, **"Mar"**, and Maya disappears. The app is not reading through all of your 800 contacts on every key press. It behaves as if the names were filed in a cabinet of nested drawers: one drawer for every first letter, inside it a drawer for every second letter, and so on. To find everyone starting with "Mar" you open the **M** drawer, then the **a** drawer inside it, then the **r** drawer — three moves — and everything inside that last drawer is your answer.

That cabinet of nested drawers is a **trie**. The name comes from re*trie*val, and most people pronounce it "try" so that it does not sound like "tree". It is the data structure to reach for whenever a problem talks about **prefixes**: autocomplete, "does any word start with…", spell checking, or matching the longest known prefix of a string.

## 2. What a Trie Is

A trie is a tree where **each edge is one character** and **each path from the root spells out a string**. The root is empty. Words that begin the same way share the beginning of their path, so the prefix "ca" in *car*, *card*, *care* and *cat* is stored only once.

Because a path such as \`c → a → r\` could be a whole word ("car") or only the start of a longer word ("card"), every node carries a small flag that says *a word ends here*.

📌 **Interview term: Trie (prefix tree)** — a tree that stores strings letter by letter, one character per edge, so that all strings with a common prefix share one path from the root.

📌 **Interview term: Prefix** — the first k characters of a string. "ca" is a prefix of "card"; the empty string is a prefix of every string.

📌 **Interview term: End-of-word marker** — a boolean on a node (often called \`is_end\` or \`isEnd\`) that is true when the path from the root to this node is a complete inserted word, not just the start of one.

Here is the trie for the words *car, card, care, cat, dog, do*:

<svg class="iq-diagram" width="100%" viewBox="0 0 660 400" role="img" aria-label="A trie holding car, card, care, cat, dog and do. The prefix c a is stored once and shared by four words">
  <rect class="d-box-accent" x="500" y="20" width="22" height="22" rx="11"/>
  <text class="d-sub" x="532" y="36">word ends here</text>
  <path class="d-edge" d="M 330 58 L 210 112"/>
  <path class="d-edge" d="M 330 58 L 470 112"/>
  <path class="d-edge" d="M 200 150 L 200 190"/>
  <path class="d-edge" d="M 470 150 L 470 190"/>
  <path class="d-edge" d="M 190 228 L 130 272"/>
  <path class="d-edge" d="M 210 228 L 270 272"/>
  <path class="d-edge" d="M 470 228 L 470 272"/>
  <path class="d-edge" d="M 120 310 L 80 352"/>
  <path class="d-edge" d="M 140 310 L 190 352"/>
  <circle class="d-box-muted" cx="330" cy="40" r="20"/>
  <text class="d-sub" x="330" y="45" text-anchor="middle">root</text>
  <circle class="d-box" cx="200" cy="130" r="20"/>
  <text class="d-text" x="200" y="136" text-anchor="middle">c</text>
  <circle class="d-box" cx="470" cy="130" r="20"/>
  <text class="d-text" x="470" y="136" text-anchor="middle">d</text>
  <circle class="d-box" cx="200" cy="210" r="20"/>
  <text class="d-text" x="200" y="216" text-anchor="middle">a</text>
  <circle class="d-box-accent" cx="470" cy="210" r="20"/>
  <text class="d-text" x="470" y="216" text-anchor="middle">o</text>
  <circle class="d-box-accent" cx="130" cy="290" r="20"/>
  <text class="d-text" x="130" y="296" text-anchor="middle">r</text>
  <circle class="d-box-accent" cx="270" cy="290" r="20"/>
  <text class="d-text" x="270" y="296" text-anchor="middle">t</text>
  <circle class="d-box-accent" cx="470" cy="290" r="20"/>
  <text class="d-text" x="470" y="296" text-anchor="middle">g</text>
  <circle class="d-box-accent" cx="70" cy="370" r="20"/>
  <text class="d-text" x="70" y="376" text-anchor="middle">d</text>
  <circle class="d-box-accent" cx="200" cy="370" r="20"/>
  <text class="d-text" x="200" y="376" text-anchor="middle">e</text>
  <text class="d-sub" x="560" y="216">do</text>
  <text class="d-sub" x="330" y="296">cat</text>
  <text class="d-sub" x="530" y="296">dog</text>
  <text class="d-sub" x="20" y="300">car</text>
  <text class="d-sub" x="110" y="390">card</text>
  <text class="d-sub" x="240" y="390">care</text>
</svg>

The six words have 19 letters in total, but the trie needs only 9 nodes below the root, because "ca" and "d" are shared. Notice that **o** is marked as an end (for "do") even though it also has a child (for "dog"): end-of-word is a flag, not "has no children".

## 3. The Three Core Operations

Every trie question builds on three operations. All three walk down from the root one character at a time, so each costs **O(L)**, where L is the length of the word or prefix — no matter how many words the trie holds. (If [Big-O](/interview-question/what-is-big-o-notation) is new to you, read that page first.)

| Operation | What it does | Returns |
| :--- | :--- | :--- |
| \`insert(word)\` | Walk the letters; create a child when it is missing; set the end flag on the last node | nothing |
| \`search(word)\` | Walk the letters; fail if a child is missing; at the end, check the end flag | is the whole word stored? |
| \`startsWith(prefix)\` | Same walk, but **no** end-flag check | is any stored word starting with this prefix? |

The only difference between \`search\` and \`startsWith\` is that last check:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="Both search and startsWith walk the same path. search also needs the end of word flag, startsWith only needs the node to exist">
  <defs>
    <marker id="b18q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="75" width="170" height="70" rx="10"/>
  <text class="d-text" x="105" y="105" text-anchor="middle">walk c then a</text>
  <text class="d-sub" x="105" y="127" text-anchor="middle">one child per letter</text>
  <path class="d-edge" d="M 192 110 L 252 110" marker-end="url(#b18q1-arrow)"/>
  <rect class="d-box-muted" x="256" y="75" width="170" height="70" rx="10"/>
  <text class="d-text" x="341" y="105" text-anchor="middle">reached node a</text>
  <text class="d-sub" x="341" y="127" text-anchor="middle">missing child: stop</text>
  <path class="d-edge" d="M 428 95 L 486 52" marker-end="url(#b18q1-arrow)"/>
  <path class="d-edge" d="M 428 125 L 486 168" marker-end="url(#b18q1-arrow)"/>
  <rect class="d-box-accent" x="490" y="16" width="210" height="64" rx="10"/>
  <text class="d-text" x="595" y="42" text-anchor="middle">search: end flag set?</text>
  <text class="d-sub" x="595" y="64" text-anchor="middle">no, so ca is not a word</text>
  <rect class="d-box-accent" x="490" y="140" width="210" height="64" rx="10"/>
  <text class="d-text" x="595" y="166" text-anchor="middle">startsWith: node exists</text>
  <text class="d-sub" x="595" y="188" text-anchor="middle">yes, so some word starts ca</text>
</svg>

With *car, card, care, cat* stored, the walk for "ca" succeeds — node **a** exists — so \`startsWith("ca")\` is true. But nobody inserted "ca" itself, so its end flag is false and \`search("ca")\` is false.

A very useful extra is a **count on every node**: how many inserted words pass through it. Then "how many words start with this prefix?" is just the count on the node where the walk ends — still O(L), with no need to visit the subtree.

📌 **Interview term: Prefix count** — a counter stored on each trie node, incremented on every insert that passes through it, so the number of words under a prefix is read in O(L).

## 4. The Code in C++

In C++ a common choice is a fixed **array of 26 owning pointers**, \`std::array<std::unique_ptr<TrieNode>, 26>\`, indexed by \`ch - 'a'\`. \`std::unique_ptr\` means each node owns its children: when the trie is destroyed, every node is freed automatically, with no \`delete\` calls to forget. The array is fast and its index order is alphabetical order. The cost is 26 pointers per node even when most are empty, and it only works for a–z. For a larger alphabet use \`std::unordered_map<char, std::unique_ptr<TrieNode>>\`, or \`std::map\` if you want sorted children.

~~~cpp
struct TrieNode {
    std::array<std::unique_ptr<TrieNode>, 26> children{}; // index = letter - 'a'
    bool isEnd = false;                                    // a whole word ends here
    int count = 0;                                         // words passing through
};

class Trie {
public:
    int nodes = 0; // nodes created, not counting the root

    void insert(const std::string& word) {
        TrieNode* node = &root;
        node->count++;
        for (char ch : word) {
            auto& next = node->children[ch - 'a'];
            if (!next) {
                next = std::make_unique<TrieNode>();
                nodes++;
            }
            node = next.get();
            node->count++;
        }
        node->isEnd = true;
    }

    bool search(const std::string& word) const {
        const TrieNode* node = walk(word);
        return node != nullptr && node->isEnd;
    }

    bool startsWith(const std::string& prefix) const { return walk(prefix) != nullptr; }

    int countPrefix(const std::string& prefix) const {
        const TrieNode* node = walk(prefix);
        return node == nullptr ? 0 : node->count;
    }

private:
    TrieNode root;

    const TrieNode* walk(const std::string& s) const {
        const TrieNode* node = &root;
        for (char ch : s) {
            node = node->children[ch - 'a'].get();
            if (node == nullptr) return nullptr;
        }
        return node;
    }
};
~~~

**What to point out in this code:**

- \`walk\` is a \`const\` member returning \`const TrieNode*\`, so \`search\`, \`startsWith\` and \`countPrefix\` can all be \`const\` too.
- \`auto& next = node->children[ch - 'a'];\` takes a **reference** to the slot, so assigning \`std::make_unique<TrieNode>()\` to it fills the slot inside the node, not a copy.
- \`ch - 'a'\` is only safe for \`'a'\`–\`'z'\`. Any other character gives a negative or too-large index, which is undefined behaviour (no exception, just memory corruption). Validate input first.
- \`std::array<..., 26> children{}\` value-initialises every slot to \`nullptr\`.
- Destroying a \`unique_ptr\` chain is recursive, one stack frame per level. For normal words that is fine; for a single string of millions of characters it could exhaust the stack.

## 5. When Is a Trie Useful?

A trie earns its memory when the question is about **prefixes**, or when many strings share long beginnings and you look them up character by character.

| Use | Why a trie fits |
| :--- | :--- |
| Autocomplete / type-ahead | Walk the typed prefix, then list the subtree — see [Implement Trie for autocomplete — how do you handle wildcards (.)?](/interview-question/implement-trie-for-autocomplete-how-do-you-handle-wildcards) |
| "Does any word start with p?" | \`startsWith\` is O(len p); a hash set cannot answer it without scanning |
| Counting words with a prefix | A count per node answers it in O(len p) |
| Pattern search with \`.\` wildcards | Branch only where the pattern has a dot (the autocomplete page shows this) |
| Longest prefix match (IP routing tables, dictionaries) | Walk as far as possible and remember the last end-of-word node |
| Many dictionary lookups inside one text, as in [word break](/interview-question/how-do-you-solve-the-word-break-problem) | From a start position, one walk tests every dictionary word that begins there |
| [longest common prefix](/interview-question/how-do-you-find-the-longest-common-prefix-of-an-array-of-strings) of many strings | The path from the root until the first branch or end flag |

**When a trie is the wrong tool:** if you only ever ask "is this exact word present?", a [hash table](/interview-question/how-does-a-hash-table-work) does the same O(L) work with far less memory and simpler code. If you need words in sorted order with range queries but rarely prefixes, a sorted array with [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) or a balanced [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) is often enough.

| Structure | Exact lookup | Prefix query ("all words starting p") | Memory |
| :--- | :--- | :--- | :--- |
| Hash set | O(L) average | O(N · L): must test every word | one copy of each word |
| Sorted array + binary search | O(L log N) | O(L log N) to find the first match, then walk forward | one copy of each word |
| Balanced BST of strings | O(L log N) | same idea as the sorted array | one copy + tree pointers |
| Trie | O(L) | O(L) to reach the prefix node, then the size of its subtree | one node per distinct prefix; each node has child links |

<svg class="iq-diagram" width="100%" viewBox="0 0 700 230" role="img" aria-label="For the prefix question a hash set must test every word, while a trie walks three letters and then reads only the matching subtree">
  <rect class="d-box-muted" x="20" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="170" y="62" text-anchor="middle">hash set: words starting abc</text>
  <text class="d-sub" x="170" y="88" text-anchor="middle">test every one of the N words</text>
  <rect class="d-box-accent" x="380" y="30" width="300" height="80" rx="10"/>
  <text class="d-text" x="530" y="62" text-anchor="middle">trie: words starting abc</text>
  <text class="d-sub" x="530" y="88" text-anchor="middle">walk 3 nodes, then the subtree</text>
  <rect class="d-box" x="20" y="150" width="300" height="60" rx="10"/>
  <text class="d-text" x="170" y="186" text-anchor="middle">3776 words checked</text>
  <rect class="d-box" x="380" y="150" width="300" height="60" rx="10"/>
  <text class="d-text" x="530" y="186" text-anchor="middle">62 nodes visited</text>
  <path class="d-edge" d="M 170 112 L 170 148"/>
  <path class="d-edge" d="M 530 112 L 530 148"/>
</svg>

Example 2 below measures exactly this on 3,776 distinct random words: the hash set had to test all 3,776 words to find the 29 that start with "abc", while the trie walked 3 nodes and then 59 more in the matching subtree — 62 in total.

📌 **Interview term: Alphabet size (Σ)** — the number of different characters that can appear. It decides how children are stored: a fixed array of Σ slots, or a hash map that holds only the children that exist.

## 6. Verified: Running the Code

Each example below was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). The same two programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. Example 2 builds 5,000 random words over the letters a–e with a small deterministic generator (MINSTD), so every language sees the same words.

**Example 1 — insert, search, startsWith and prefix counts on six words** prints:

~~~text
true
false
true
false
true
false
3
2
6
nodes: 9, letters inserted: 19
~~~

\`search("ca")\` is false while \`startsWith("ca")\` is true — the end-flag difference from section 3 — and the six words (19 letters) need only 9 nodes.

**Example 2 — listing words under a prefix, prefix sharing, and trie vs hash set** prints:

~~~text
prefix te -> [tea, ten, tent], nodes visited 5
prefix i  -> [i, in, inn], nodes visited 3
prefix x  -> [], nodes visited 0
distinct words 3776, letters 27461, trie nodes 7649
prefix abc: trie found 29 visiting 62 nodes
prefix abc: set scan found 29 checking 3776 words
~~~

Three things to read from this output:

- The words under a prefix come out **alphabetically** ("tea, ten, tent") because the DFS visits children in letter order and records a word before its extensions (a preorder [tree traversal](/interview-question/what-are-the-tree-traversal-methods)). "nodes visited 5" is 2 nodes to walk "te" plus 3 in its subtree.
- 3,776 distinct words with 27,461 letters (including repeats) fit in **7,649 nodes**: shared prefixes are stored once.
- For the prefix "abc", the trie visited **62** nodes; the hash set had to test all **3,776** words. Both found the same 29 words.

## 7. Complexity

L = length of the word or prefix, N = number of words, Σ = alphabet size, k = number of words returned.

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`insert\` | O(L) | one step per character |
| \`search\` / \`startsWith\` / \`countPrefix\` | O(L) | one step per character; the end flag and the count are O(1) reads |
| List all words with a prefix | O(L + size of that subtree) | walk the prefix, then visit each node below it once |
| Build from N words | O(total characters) | each character is one insert step |

| Space | Bound | Why |
| :--- | :--- | :--- |
| Nodes | at most total characters | one node per distinct prefix; shared prefixes save nodes (7,649 nodes for 27,461 letters in example 2) |
| Per node | O(Σ) with an array, O(children) with a map | the trade-off between speed and memory |

With 26-slot arrays every node holds 26 pointers even if it has one child: 7,649 nodes means 198,874 slots, most of them empty.

## 8. Edge Cases

- **The empty string.** \`search("")\` is false unless "" was inserted (the root end flag is false); \`startsWith("")\` is true and \`countPrefix("")\` is the total number of words (6 in example 1).
- **A word that is a prefix of another** ("do" and "dog"). The end flag on **o** is what keeps "do" findable; deleting "dog" must not clear it.
- **Duplicate inserts.** Decide whether a repeat counts twice. Example 1 counts every insert; example 2 only counts a word the first time its end flag is set.
- **A prefix that is not present** ("x", "cow"). The walk stops at the first missing child and the answer is false / zero / an empty list.
- **Characters outside the alphabet** (upper case, digits, spaces). A 26-slot array cannot hold them; a map can.

## Common Pitfalls

- **Confusing \`search\` with \`startsWith\`.** Forgetting the \`isEnd\` check makes \`search("ca")\` return \`true\`.
- **Raw \`new\` without \`delete\`.** \`TrieNode* children[26]\` with \`new\` leaks every node unless you write a destructor; \`std::unique_ptr\` frees them automatically.
- **\`ch - 'a'\` on other characters** is undefined behaviour, not an exception. \`char\` may be signed, so a non-ASCII byte gives a negative index.
- **Copying strings in the DFS.** Passing \`std::string path\` by value copies it at every level. Example 2 passes one \`std::string&\` and uses \`push_back\`/\`pop_back\` (backtracking).
- **Expecting \`std::unordered_map\` children to come out sorted.** They do not; use the array or \`std::map\` when you need alphabetical order.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">A trie is a tree of characters: each root-to-node path spells a prefix, and an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isEnd</code> flag marks complete words.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The operations:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">insert</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">search</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startsWith</code> all walk one child per character, so each is O(L), independent of how many words are stored.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The difference:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">search</code> also checks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isEnd</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">startsWith</code> only needs the node to exist.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When to use it:</strong> <span style="color:#f0e2c8;">Prefix questions — autocomplete, prefix counts, wildcard search, longest prefix match. For exact lookups only, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::unordered_set</code> is simpler and smaller.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::array&lt;std::unique_ptr&lt;TrieNode&gt;, 26&gt;</code> children: alphabetical, fast, and freed automatically. Validate characters, because a bad index is undefined behaviour.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::unordered_set&lt;std::string&gt;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It answers exact lookups, but a prefix query must compare every word. In our run that was 3776 checks against 62 trie nodes. A sorted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::set</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lower_bound(prefix)</code> is the middle ground.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unique_ptr</code> instead of raw pointers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Ownership is explicit and the whole trie is freed when the root goes out of scope, with no destructor to write and no leaks.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you count words with a prefix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int count</code> per node, incremented during insert; read it at the end of the walk: O(L).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you delete a word?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recursive helper: clear <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isEnd</code> at the last node, and on the way back <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reset()</code> a child that has no children and is not a word end.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the memory cost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">26 pointers per node with the array, most of them null: 7649 nodes is 198874 slots. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::unordered_map</code> or a sorted vector of (char, child) pairs when memory matters more than speed.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Trie (prefix tree)** | A tree of characters where words with a common prefix share a path |
| **Prefix** | The first k characters of a string |
| **End-of-word marker** | A flag on a node saying a whole inserted word ends there |
| **Prefix count** | A counter per node giving how many words pass through it |
| **Alphabet size (Σ)** | How many different characters can appear; decides array vs map children |

---
**Conclusion:** A trie is a tree of characters where shared prefixes are stored once and an \`isEnd\` flag marks complete words. In C++, \`std::array<std::unique_ptr<TrieNode>, 26>\` gives fast, alphabetical children that are freed automatically, as long as you validate characters before computing \`ch - 'a'\`. \`insert\`, \`search\` and \`startsWith\` each cost O(L) however many words you store, which makes the trie the right tool for prefix questions and \`std::unordered_set\` the right tool for exact lookups only.`,
        examples: [
          {
            label: `Trie basics: insert, search, startsWith, prefix counts`,
            code: `#include <array>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct TrieNode {
    std::array<std::unique_ptr<TrieNode>, 26> children{}; // index = letter - 'a'
    bool isEnd = false;                                    // a whole word ends here
    int count = 0;                                         // words passing through
};

class Trie {
public:
    int nodes = 0; // nodes created, not counting the root

    void insert(const std::string& word) {
        TrieNode* node = &root;
        node->count++;
        for (char ch : word) {
            auto& next = node->children[ch - 'a'];
            if (!next) {
                next = std::make_unique<TrieNode>();
                nodes++;
            }
            node = next.get();
            node->count++;
        }
        node->isEnd = true;
    }

    bool search(const std::string& word) const {
        const TrieNode* node = walk(word);
        return node != nullptr && node->isEnd;
    }

    bool startsWith(const std::string& prefix) const { return walk(prefix) != nullptr; }

    int countPrefix(const std::string& prefix) const {
        const TrieNode* node = walk(prefix);
        return node == nullptr ? 0 : node->count;
    }

private:
    TrieNode root;

    const TrieNode* walk(const std::string& s) const {
        const TrieNode* node = &root;
        for (char ch : s) {
            node = node->children[ch - 'a'].get();
            if (node == nullptr) return nullptr;
        }
        return node;
    }
};

int main() {
    std::vector<std::string> words = {"car", "card", "care", "cat", "dog", "do"};
    Trie t;
    int letters = 0;
    for (const auto& w : words) {
        t.insert(w);
        letters += static_cast<int>(w.size());
    }
    std::cout << std::boolalpha;
    std::cout << t.search("car") << "\\n";       // true
    std::cout << t.search("ca") << "\\n";        // false
    std::cout << t.startsWith("ca") << "\\n";    // true
    std::cout << t.startsWith("cow") << "\\n";   // false
    std::cout << t.search("do") << "\\n";        // true
    std::cout << t.search("") << "\\n";          // false
    std::cout << t.countPrefix("car") << "\\n";  // 3
    std::cout << t.countPrefix("d") << "\\n";    // 2
    std::cout << t.countPrefix("") << "\\n";     // 6
    std::cout << "nodes: " << t.nodes << ", letters inserted: " << letters << "\\n"; // nodes: 9, letters inserted: 19
}`,
          },
          {
            label: `Words under a prefix, prefix sharing, trie vs hash set`,
            code: `#include <iostream>
#include <memory>
#include <string>
#include <unordered_set>
#include <vector>

struct Node {
    std::unique_ptr<Node> next[26]; // array children: index order is alphabetical order
    bool isEnd = false;
};

int nodes = 0, words = 0, visited = 0;

void insert(Node& root, const std::string& w) {
    Node* node = &root;
    for (char ch : w) {
        auto& child = node->next[ch - 'a'];
        if (!child) {
            child = std::make_unique<Node>();
            nodes++;
        }
        node = child.get();
    }
    if (!node->isEnd) {
        node->isEnd = true;
        words++;
    }
}

void dfs(const Node* n, std::string& path, std::vector<std::string>& out) {
    if (n->isEnd) out.push_back(path);
    for (int c = 0; c < 26; c++) {
        if (!n->next[c]) continue;
        visited++;
        path.push_back(static_cast<char>('a' + c));
        dfs(n->next[c].get(), path, out);
        path.pop_back(); // undo: one shared string, no copies
    }
}

std::vector<std::string> withPrefix(const Node& root, const std::string& prefix) {
    visited = 0;
    std::vector<std::string> out;
    const Node* node = &root;
    for (char ch : prefix) {
        node = node->next[ch - 'a'].get();
        if (!node) return out;
        visited++;
    }
    std::string path = prefix;
    dfs(node, path, out);
    return out;
}

std::string fmt(const std::vector<std::string>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + xs[i];
    return s + "]";
}

long long seed = 7;
int nxt() {
    seed = seed * 48271 % 2147483647LL;
    return static_cast<int>(seed);
}

int main() {
    Node small;
    for (const char* w : {"tea", "ten", "to", "inn", "in", "tent", "i"}) insert(small, w);
    auto r = withPrefix(small, "te");
    std::cout << "prefix te -> " << fmt(r) << ", nodes visited " << visited << "\\n";
    r = withPrefix(small, "i");
    std::cout << "prefix i  -> " << fmt(r) << ", nodes visited " << visited << "\\n";
    r = withPrefix(small, "x");
    std::cout << "prefix x  -> " << fmt(r) << ", nodes visited " << visited << "\\n";

    nodes = 0;
    words = 0;
    Node big;
    std::unordered_set<std::string> dictionary;
    int letters = 0;
    for (int i = 0; i < 5000; i++) {
        int len = 3 + nxt() % 6;
        std::string w;
        for (int j = 0; j < len; j++) w += static_cast<char>('a' + nxt() % 5);
        insert(big, w);
        dictionary.insert(w);
        letters += len;
    }
    std::cout << "distinct words " << words << ", letters " << letters << ", trie nodes " << nodes << "\\n";

    r = withPrefix(big, "abc");
    int checked = 0, scan = 0;
    for (const auto& w : dictionary) { // what a hash set has to do for a prefix question
        checked++;
        if (w.compare(0, 3, "abc") == 0) scan++;
    }
    std::cout << "prefix abc: trie found " << r.size() << " visiting " << visited << " nodes\\n";
    std::cout << "prefix abc: set scan found " << scan << " checking " << checked << " words\\n";
}`,
          },
        ],
      },
    },
  },
  {
    title: `Implement Trie for autocomplete — how do you handle wildcards (.)?`,
    difficulty: "medium",
    seoDescription: `Build a trie for autocomplete and '.' wildcard search: prefix walk, sorted DFS for top-k suggestions, and wildcard cost, verified in four languages.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Design a word dictionary in Python with \`addWord(word)\` and \`search(pattern)\`, where a \`.\` in the pattern matches any single letter. Then extend it to autocomplete: as the user types, return up to three suggestions in alphabetical order. What does a search cost when the pattern has many dots?"

**What a strong answer should cover:**
- A trie with an end-of-word flag; \`addWord\` is an O(L) insert.
- A recursive search with an index: one child for a letter, every child for a \`.\`, the end flag at the end, and an early return on the first match.
- Autocomplete as "walk the prefix, then a preorder DFS in letter order that stops after k words", which yields alphabetical results without sorting.
- Honest complexity: O(L) without dots, up to Σ^d paths with d dots (bounded by the trie size); a brute-force list scan is O(N·L) per query.
- Python details: \`dict\` children, \`any()\` over a generator (not a list) for the early exit, \`sorted()\` because dicts keep insertion order, and passing an index rather than slicing the pattern.

**Clarifying questions expected:**
- Does \`.\` match exactly one letter? Is there also a \`*\`?
- Should suggestions be alphabetical or ranked by popularity, and how many?
- Is the alphabet only lower-case a–z?

**Code / implementation expected:** Yes — a \`WordDictionary\`/trie class with \`addWord\`, \`search\` (with \`.\`) and a \`suggest(prefix, k)\` method, in Python.`,
        answer: `**Target Audience:** Developers who know what a trie is and want the classic design question — you need recursion and basic classes.  
**Difficulty:** Medium  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are stuck on a crossword. The clue is "angry", the answer has three letters, and you only know the last two: **_ a d**. You ask a friend with a dictionary to read you every three-letter word ending in "ad": bad, dad, fad, had, lad, mad, pad, sad… The friend does not read the whole dictionary. They flip to each starting letter in turn, check whether "?ad" exists under it, and move on.

That is exactly how a trie handles a wildcard. For ordinary letters there is only one way forward — follow that letter. At a **dot**, any letter will do, so the search tries **every child** and keeps going from each one. Autocomplete is the same tree used the other way round: walk the letters the user has typed, then read out the words that live underneath.

This question is a favourite (it is LeetCode 211, "Design Add and Search Words Data Structure", plus a search-suggestions twist) because it checks three things at once: can you build a trie, can you write a clean recursive search that branches only when it must, and can you reason about the worst case when the pattern is mostly dots.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does \`.\` match exactly one letter, never zero? | Exactly one keeps the search depth equal to the pattern length. A \`*\` that matches zero or more letters needs a different, branching recursion. |
| Do you want a yes/no (\`search\`) or the list of matching words? | Yes/no can stop at the first match; a list must explore every branch. |
| How should suggestions be ordered, and how many? | Alphabetical top-k falls out of a sorted DFS. "Most popular first" needs a count per word and a [heap](/interview-question/what-is-a-heap-priority-queue) or a cached top-k per node. |
| What is the alphabet? Only lower-case a–z? | Decides between a 26-slot array and a hash map for children, and how many branches a dot can open. |
| How many words, how long, and how many dots per query? | Mostly-dot patterns are the worst case; if they are common, grouping words by length may beat the trie. |
| Can words be deleted? | Deletion needs end-flag clearing and pruning of empty nodes. |

## 3. The Core Idea: Branch Only at a Dot

Start from a normal trie (if the structure is new to you, read [What is a trie and when is it useful?](/interview-question/what-is-a-trie-and-when-is-it-useful) first): one child per letter and an end-of-word flag. Adding a word is the usual insert. Searching a pattern is a **recursive walk** with the position \`i\` in the pattern:

1. If \`i\` equals the pattern length, we have used every character: the answer is the end flag of the current node.
2. If \`pattern[i]\` is a letter, follow that one child (or fail if it is missing).
3. If \`pattern[i]\` is \`.\`, try **each child** in turn; succeed as soon as one of them succeeds.

📌 **Interview term: Wildcard** — a pattern character that stands for "any one character". Here it is \`.\`, as in regular expressions.

📌 **Interview term: Depth-first search (DFS)** — explore one branch all the way down before trying the next. The wildcard search is a DFS over the trie; see [depth-first search](/interview-question/what-is-the-difference-between-bfs-and-dfs).

📌 **Interview term: Short-circuit** — stop exploring as soon as the answer is known. A yes/no search returns \`true\` on the first full match instead of visiting the remaining branches.

Here is the search for \`.ad\` in a trie with *bad, dad, mad*:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 340" role="img" aria-label="Searching dot a d in a trie holding bad, dad and mad. At the dot the search tries every child of the root and the first branch b a d succeeds">
  <path class="d-edge-accent" d="M 335 58 L 190 112"/>
  <path class="d-edge-dashed" d="M 340 60 L 340 110"/>
  <path class="d-edge-dashed" d="M 345 58 L 490 112"/>
  <path class="d-edge-accent" d="M 180 150 L 180 190"/>
  <path class="d-edge" d="M 340 150 L 340 190"/>
  <path class="d-edge" d="M 500 150 L 500 190"/>
  <path class="d-edge-accent" d="M 180 230 L 180 270"/>
  <path class="d-edge" d="M 340 230 L 340 270"/>
  <path class="d-edge" d="M 500 230 L 500 270"/>
  <circle class="d-box-muted" cx="340" cy="40" r="20"/>
  <text class="d-sub" x="340" y="45" text-anchor="middle">root</text>
  <circle class="d-box-accent" cx="180" cy="130" r="20"/>
  <text class="d-text" x="180" y="136" text-anchor="middle">b</text>
  <circle class="d-box" cx="340" cy="130" r="20"/>
  <text class="d-text" x="340" y="136" text-anchor="middle">d</text>
  <circle class="d-box" cx="500" cy="130" r="20"/>
  <text class="d-text" x="500" y="136" text-anchor="middle">m</text>
  <circle class="d-box-accent" cx="180" cy="210" r="20"/>
  <text class="d-text" x="180" y="216" text-anchor="middle">a</text>
  <circle class="d-box" cx="340" cy="210" r="20"/>
  <text class="d-text" x="340" y="216" text-anchor="middle">a</text>
  <circle class="d-box" cx="500" cy="210" r="20"/>
  <text class="d-text" x="500" y="216" text-anchor="middle">a</text>
  <circle class="d-box-accent" cx="180" cy="290" r="20"/>
  <text class="d-text" x="180" y="296" text-anchor="middle">d</text>
  <circle class="d-box" cx="340" cy="290" r="20"/>
  <text class="d-text" x="340" y="296" text-anchor="middle">d</text>
  <circle class="d-box" cx="500" cy="290" r="20"/>
  <text class="d-text" x="500" y="296" text-anchor="middle">d</text>
  <text class="d-sub" x="560" y="45">dot: try each child</text>
  <text class="d-sub" x="560" y="216">a: one child only</text>
  <text class="d-sub" x="560" y="296">d: end flag, match</text>
  <text class="d-sub" x="40" y="136">tried first</text>
</svg>

At the root the pattern says \`.\`, so all three children are candidates. The search tries **b** first, then has no choice for "a" and "d", reaches an end flag and returns true. The **d** and **m** branches (dashed) are never entered because of the short-circuit. This is [backtracking](/interview-question/what-is-backtracking) in its simplest form: try a choice, and if it fails, return and try the next one.

📌 **Interview term: Branching factor** — how many children a node can have, at most the alphabet size Σ. Each dot multiplies the number of paths by up to Σ, which is why dot-heavy patterns are the expensive case.

## 4. Autocomplete: Walk the Prefix, Then List the Subtree

Every word that starts with a prefix lives in the subtree under the prefix node. So autocomplete has two phases:

<svg class="iq-diagram" width="100%" viewBox="0 0 780 150" role="img" aria-label="Autocomplete in four steps: walk the typed prefix, take the subtree under it, list words with a preorder DFS in letter order, stop after k words">
  <defs>
    <marker id="b18q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="10" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="90" y="70" text-anchor="middle">walk the prefix</text>
  <text class="d-sub" x="90" y="92" text-anchor="middle">m, o, u</text>
  <path class="d-edge" d="M 172 75 L 212 75" marker-end="url(#b18q2-arrow)"/>
  <rect class="d-box-muted" x="216" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="296" y="70" text-anchor="middle">subtree of u</text>
  <text class="d-sub" x="296" y="92" text-anchor="middle">every match lives here</text>
  <path class="d-edge" d="M 378 75 L 418 75" marker-end="url(#b18q2-arrow)"/>
  <rect class="d-box-accent" x="422" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="502" y="70" text-anchor="middle">preorder DFS</text>
  <text class="d-sub" x="502" y="92" text-anchor="middle">letters a to z</text>
  <path class="d-edge" d="M 584 75 L 624 75" marker-end="url(#b18q2-arrow)"/>
  <rect class="d-box-accent" x="628" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="698" y="70" text-anchor="middle">stop at k</text>
  <text class="d-sub" x="698" y="92" text-anchor="middle">mouse, mousepad</text>
</svg>

The DFS in phase two visits children **in letter order** and records a word **before** its extensions, so "mouse" comes before "mousepad". That is a preorder traversal, and it produces words in exact alphabetical order — no sorting of the results is needed. Stopping once \`k\` words are collected keeps each keystroke cheap.

📌 **Interview term: Preorder traversal** — visit a node before its children. On a trie with children in letter order, preorder lists words alphabetically.

📌 **Interview term: Top-k suggestions** — return only the first k results (here the alphabetically smallest). With popularity ranking you would store a count per word and keep the best k with a heap.

The two ideas combine: if the typed prefix itself contains dots (\`mo.i\`), phase one becomes the wildcard walk — it can end at **several** nodes — and phase two collects from each of them in order. Example 2 does this and finds *mobile* and *monitor*.

## 5. Brute Force First, and Why the Trie Wins

The obvious solution keeps the words in a list. To answer \`search(pattern)\`, compare the pattern with every word of the same length, letter by letter, treating \`.\` as "anything". That is **O(N · L)** per query for N words of length L, every time. For autocomplete you would scan the whole list on every keystroke.

The trie pays for its structure once, at insert time. After that:

- a pattern **without** dots costs O(L): one child per letter;
- a pattern **with** dots only branches where the dots are, and only into children that actually exist;
- autocomplete costs O(length of prefix) to find the subtree, plus the work to list the first k words.

The honest caveat is the worst case: a pattern made almost entirely of dots that matches nothing forces the search to visit nearly every node at those depths. Example 2 measures it on 5,000 random words (the same trie as on the trie page, 7,649 nodes below the root): \`abcd\` visited 5 nodes, but \`.......x\` visited **6,804** nodes before answering false, because the \`x\` at the end can never match a word made of a–e letters. If such queries are common, a hash map from word length to the list of words is a reasonable alternative for them.

## 6. The Code in Python

The Python version stores children in a \`dict\`. The search is a nested function \`dfs(node, i)\` that closes over \`pattern\`, so the recursion only passes the two things that change. At a dot, \`any(...)\` over a generator expression gives the short-circuit for free: \`any\` stops pulling from the generator as soon as one call returns \`True\`.

~~~python
class WordDictionary:
    def __init__(self):
        self.root = Node()

    def add_word(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = Node()
            node = node.children[ch]
        node.is_end = True

    def search(self, pattern):
        """'.' matches any one letter. DFS: branch only at a dot."""
        def dfs(node, i):
            if i == len(pattern):
                return node.is_end
            ch = pattern[i]
            if ch == ".":
                return any(dfs(child, i + 1) for child in node.children.values())
            child = node.children.get(ch)
            return child is not None and dfs(child, i + 1)

        return dfs(self.root, 0)
~~~

**What to point out in this code:**

- The base case \`i == len(pattern)\` returns \`node.is_end\`, so \`search("b.")\` is false even though the path b → a exists: "ba" was never inserted.
- \`node.children.get(ch)\` returns \`None\` for a missing letter, so the letter case is one line.
- \`any(dfs(child, i + 1) for child in ...)\` uses a **generator**, not a list. With a list comprehension \`any([...])\` every branch would run before \`any\` looked at the results, and the short-circuit would be lost.
- The recursion is as deep as the pattern. Python's default recursion limit is 1000 (\`sys.getrecursionlimit()\` printed 1000 in our sandbox), so patterns near that length need an explicit stack.

For autocomplete, \`_collect\` is the preorder DFS. Two Python details matter here: \`sorted(node.children)\` is needed because a \`dict\` keeps **insertion** order ([guaranteed since Python 3.7](https://docs.python.org/3/library/stdtypes.html#dict)), not alphabetical order; and \`path + ch\` builds a new string at each level, which is fine for short words.

~~~python
def _collect(self, node, path, out, k):
    """Preorder DFS in alphabetical order: words come out sorted."""
    if len(out) == k:
        return
    if node.is_end:
        out.append(path)
    for ch in sorted(node.children):
        self._collect(node.children[ch], path + ch, out, k)

def suggest(self, prefix, k=3):
    node = self.root
    for ch in prefix:
        node = node.children.get(ch)
        if node is None:
            return []
    out = []
    self._collect(node, prefix, out, k)
    return out
~~~

## 7. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. To make the node counts identical across languages, every version tries a dot's children in alphabetical order.

**Example 1 — add and search with \`.\` (the LeetCode 211 cases plus a few edge cases)** prints:

~~~text
false
true
true
true
true
false
true
false
true
false
~~~

\`"...."\` is false because no four-letter word exists; \`"."\` is true only because "a" was added; \`"b."\` is false because "ba" is a path but not a word; \`""\` is false because the root is not a word end.

**Example 2 — per-keystroke suggestions, wildcard autocomplete, and the cost of dots** prints:

~~~text
m     [mobile, moneypot, monitor]
mo    [mobile, moneypot, monitor]
mou   [mouse, mousepad]
mous  [mouse, mousepad]
mouse [mouse, mousepad]
mo.i  [mobile, monitor]
..u   [mouse, mousepad]
x     []
search abcd     true  nodes visited 5
search abcdx    false nodes visited 5
search a..d     true  nodes visited 7
search ........ true  nodes visited 9
search .......x false nodes visited 6804
~~~

Reading it: typing "mouse" one letter at a time returns at most three alphabetical suggestions per keystroke; \`mo.i\` finds *mobile* and *monitor* through the wildcard walk; and on the 5,000-word trie a pattern with no dots or few dots costs a handful of nodes, while \`.......x\` — seven dots and an impossible last letter — visits 6,804 nodes to prove there is no match.

## 8. Complexity

L = word or pattern length, d = number of dots, Σ = alphabet size, N = number of words, k = suggestions wanted.

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`addWord\` | O(L) | one step per character |
| \`search\` without dots | O(L) | one child per letter |
| \`search\` with d dots | O(Σ^d · L) worst case, and never more than the number of trie nodes at depth ≤ L | each dot fans out to at most Σ existing children |
| \`suggest(prefix, k)\` | O(L + nodes visited until k words are found) | walk the prefix, then a DFS that stops at k |
| Brute force over a list | O(N · L) per query | compare against every word |

| Space | Bound | Why |
| :--- | :--- | :--- |
| Trie | O(total characters) nodes | one node per distinct prefix |
| Search recursion | O(L) stack frames | one frame per pattern position (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)) |

In Python, \`sorted(node.children)\` adds O(c log c) per visited node for c children (at most 26 here).

## 9. Edge Cases

- **Empty pattern** — true only if the empty word was added (example 1 prints false).
- **Pattern longer than every word** (\`"...."\`) — the walk runs out of children and returns false.
- **A path that is not a word** (\`"b."\` when only "bad" exists) — the end flag, not the existence of the node, decides.
- **A single dot** — true only if some one-letter word exists ("a" in example 1).
- **No suggestions** — a prefix that leaves the trie (\`"x"\`) returns an empty list, not an error.
- **All dots and no match** (\`".......x"\`) — the worst case; the search must try every branch (6,804 nodes in example 2).

## Common Pitfalls

- **\`any([dfs(c, i + 1) for c in ...])\` with square brackets.** The list is built first, so every branch is explored and the short-circuit is gone. Use the generator form without brackets.
- **Checking "node exists" instead of \`is_end\` at the end of the pattern.** Then \`search("b.")\` wrongly returns \`True\`.
- **Expecting dict order to be alphabetical.** Dicts keep insertion order; call \`sorted()\` for alphabetical suggestions.
- **Slicing the pattern on every call** (\`dfs(node, pattern[1:])\`). Each slice copies the rest of the string, turning O(L) work per path into O(L²). Pass the index instead.
- **Deep patterns and the recursion limit.** Python stops at about 1000 frames by default; use an explicit stack if patterns can be that long.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The structure:</strong> <span style="color:#f0e2c8;">A trie: one child per letter and an end-of-word flag. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addWord</code> is a normal O(L) insert.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The wildcard:</strong> <span style="color:#f0e2c8;">Search recursively with an index. A letter follows one child; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.</code> tries every child and returns true on the first success.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Autocomplete:</strong> <span style="color:#f0e2c8;">Walk the prefix, then a preorder DFS with children in letter order; stop after k words. The output is already alphabetical.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(L) without dots; with d dots up to Σ^d paths, bounded by the trie size. All-dot misses are the worst case — 6804 nodes in our run vs 5 for a plain word.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">Children in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any()</code> over a generator for the short-circuit; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(node.children)</code> for alphabetical suggestions; pass an index, never slice the pattern.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a regex over a word list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">re.fullmatch</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.</code> gives the right answer, but it is O(N·L) per query because it tests every word. The trie only explores branches that exist.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you rank suggestions by popularity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store a count per word; either DFS the subtree and keep the best k with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">heapq.nlargest</code>, or cache a top-k list on each node at insert time to make every keystroke O(L).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">*</code> can match zero or more letters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code>, branch two ways: skip the star (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i + 1</code>, same node) or consume one letter (same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code>, every child). Memoise on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(node id, i)</code> to avoid repeated work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you speed up dot-heavy queries?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Also keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> from word length to words. A pattern that is mostly dots can be checked against only the words of its length.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why pass the index instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pattern[1:]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Slicing copies the rest of the string on every call, adding O(L) per call. The index costs nothing.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Wildcard** | A pattern character (here \`.\`) that matches any one character |
| **Depth-first search (DFS)** | Explore one branch fully before the next |
| **Short-circuit** | Stop as soon as the answer is known |
| **Branching factor** | The number of children a node can have; a dot fans out to all of them |
| **Preorder traversal** | Visit a node before its children; on a sorted trie it lists words alphabetically |
| **Top-k suggestions** | Return only the first k results |

---
**Conclusion:** Autocomplete and wildcard search are the same trie read two ways. \`add_word\` is a normal O(L) insert; \`search\` is a recursive walk that follows one child per letter and tries every child at a \`.\`, with \`any()\` over a generator stopping at the first match; \`suggest\` walks the prefix and lists the subtree with a preorder DFS over \`sorted(node.children)\`, which yields words in alphabetical order. The cost is O(L) for plain words and grows with the number of dots — our all-dot miss visited 6,804 nodes — so say that out loud and mention length buckets for dot-heavy workloads.`,
        examples: [
          {
            label: `addWord and search with '.' wildcards`,
            code: `class Node:
    __slots__ = ("children", "is_end")

    def __init__(self):
        self.children = {}
        self.is_end = False


class WordDictionary:
    def __init__(self):
        self.root = Node()

    def add_word(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = Node()
            node = node.children[ch]
        node.is_end = True

    def search(self, pattern):
        """'.' matches any one letter. DFS: branch only at a dot."""
        def dfs(node, i):
            if i == len(pattern):
                return node.is_end
            ch = pattern[i]
            if ch == ".":
                return any(dfs(child, i + 1) for child in node.children.values())
            child = node.children.get(ch)
            return child is not None and dfs(child, i + 1)

        return dfs(self.root, 0)


def b(x):
    return str(x).lower()


d = WordDictionary()
for w in ["bad", "dad", "mad", "a"]:
    d.add_word(w)

print(b(d.search("pad")))  # false
print(b(d.search("bad")))  # true
print(b(d.search(".ad")))  # true
print(b(d.search("b..")))  # true
print(b(d.search("...")))  # true
print(b(d.search("....")))  # false
print(b(d.search(".")))  # true
print(b(d.search("b.")))  # false
print(b(d.search("..d")))  # true
print(b(d.search("")))  # false`,
          },
          {
            label: `Autocomplete per keystroke, wildcard prefixes, cost of dots`,
            code: `class Node:
    __slots__ = ("children", "is_end")

    def __init__(self):
        self.children = {}
        self.is_end = False


class Autocomplete:
    def __init__(self, words):
        self.root = Node()
        self.visited = 0
        for w in words:
            node = self.root
            for ch in w:
                if ch not in node.children:
                    node.children[ch] = Node()
                node = node.children[ch]
            node.is_end = True

    def _collect(self, node, path, out, k):
        """Preorder DFS in alphabetical order: words come out sorted."""
        if len(out) == k:
            return
        if node.is_end:
            out.append(path)
        for ch in sorted(node.children):
            self._collect(node.children[ch], path + ch, out, k)

    def suggest(self, prefix, k=3):
        node = self.root
        for ch in prefix:
            node = node.children.get(ch)
            if node is None:
                return []
        out = []
        self._collect(node, prefix, out, k)
        return out

    def suggest_pattern(self, pattern, k=10):
        """Autocomplete where the typed prefix may contain '.' wildcards."""
        out = []

        def walk(node, i, path):
            if len(out) == k:
                return
            if i == len(pattern):
                self._collect(node, path, out, k)
                return
            ch = pattern[i]
            for c in (sorted(node.children) if ch == "." else [ch]):
                if c in node.children:
                    walk(node.children[c], i + 1, path + c)

        walk(self.root, 0, "")
        return out

    def search(self, pattern):
        """Exact match with '.'; counts every node the DFS enters."""
        def dfs(node, i):
            self.visited += 1
            if i == len(pattern):
                return node.is_end
            if pattern[i] == ".":
                # sorted() so every language tries children in the same order
                return any(dfs(node.children[c], i + 1) for c in sorted(node.children))
            child = node.children.get(pattern[i])
            return child is not None and dfs(child, i + 1)

        self.visited = 0
        return dfs(self.root, 0)


def fmt(xs):
    return "[" + ", ".join(xs) + "]"


ac = Autocomplete(["mobile", "mouse", "moneypot", "monitor", "mousepad"])
typed = ""
for ch in "mouse":
    typed += ch
    print(typed.ljust(6) + fmt(ac.suggest(typed)))
print("mo.i  " + fmt(ac.suggest_pattern("mo.i")))
print("..u   " + fmt(ac.suggest_pattern("..u")))
print("x     " + fmt(ac.suggest("x")))

seed = 7
def nxt():
    global seed
    seed = seed * 48271 % 2147483647
    return seed

words = []
for _ in range(5000):
    n = 3 + nxt() % 6
    words.append("".join(chr(97 + nxt() % 5) for _ in range(n)))
big = Autocomplete(words)
for p in ["abcd", "abcdx", "a..d", "........", ".......x"]:
    found = big.search(p)
    print("search " + p.ljust(9) + str(found).lower().ljust(6) + "nodes visited " + str(big.visited))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Design a word dictionary in JavaScript with \`addWord(word)\` and \`search(pattern)\`, where a \`.\` in the pattern matches any single letter. Then extend it to autocomplete: as the user types, return up to three suggestions in alphabetical order. What does a search cost when the pattern has many dots?"

**What a strong answer should cover:**
- A trie with an end-of-word flag; \`addWord\` is an O(L) insert.
- A recursive search with an index: one child for a letter, every child for a \`.\`, the end flag at the end, and an early return on the first match.
- Autocomplete as "walk the prefix, then a preorder DFS in letter order that stops after k words", which yields alphabetical results without sorting.
- Honest complexity: O(L) without dots, up to Σ^d paths with d dots (bounded by the trie size); a brute-force list scan is O(N·L) per query.
- JavaScript details: \`Map\` children, an early \`return\` from \`for...of\` (a \`forEach\` cannot stop), sorting \`Map\` keys for alphabetical output, and always returning a real boolean.

**Clarifying questions expected:**
- Does \`.\` match exactly one letter? Is there also a \`*\`?
- Should suggestions be alphabetical or ranked by popularity, and how many?
- Is the alphabet only lower-case a–z?

**Code / implementation expected:** Yes — a \`WordDictionary\`/trie class with \`addWord\`, \`search\` (with \`.\`) and a \`suggest(prefix, k)\` method, in JavaScript.`,
        answer: `**Target Audience:** Developers who know what a trie is and want the classic design question — you need recursion and basic classes.  
**Difficulty:** Medium  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are stuck on a crossword. The clue is "angry", the answer has three letters, and you only know the last two: **_ a d**. You ask a friend with a dictionary to read you every three-letter word ending in "ad": bad, dad, fad, had, lad, mad, pad, sad… The friend does not read the whole dictionary. They flip to each starting letter in turn, check whether "?ad" exists under it, and move on.

That is exactly how a trie handles a wildcard. For ordinary letters there is only one way forward — follow that letter. At a **dot**, any letter will do, so the search tries **every child** and keeps going from each one. Autocomplete is the same tree used the other way round: walk the letters the user has typed, then read out the words that live underneath.

This question is a favourite (it is LeetCode 211, "Design Add and Search Words Data Structure", plus a search-suggestions twist) because it checks three things at once: can you build a trie, can you write a clean recursive search that branches only when it must, and can you reason about the worst case when the pattern is mostly dots.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does \`.\` match exactly one letter, never zero? | Exactly one keeps the search depth equal to the pattern length. A \`*\` that matches zero or more letters needs a different, branching recursion. |
| Do you want a yes/no (\`search\`) or the list of matching words? | Yes/no can stop at the first match; a list must explore every branch. |
| How should suggestions be ordered, and how many? | Alphabetical top-k falls out of a sorted DFS. "Most popular first" needs a count per word and a [heap](/interview-question/what-is-a-heap-priority-queue) or a cached top-k per node. |
| What is the alphabet? Only lower-case a–z? | Decides between a 26-slot array and a hash map for children, and how many branches a dot can open. |
| How many words, how long, and how many dots per query? | Mostly-dot patterns are the worst case; if they are common, grouping words by length may beat the trie. |
| Can words be deleted? | Deletion needs end-flag clearing and pruning of empty nodes. |

## 3. The Core Idea: Branch Only at a Dot

Start from a normal trie (if the structure is new to you, read [What is a trie and when is it useful?](/interview-question/what-is-a-trie-and-when-is-it-useful) first): one child per letter and an end-of-word flag. Adding a word is the usual insert. Searching a pattern is a **recursive walk** with the position \`i\` in the pattern:

1. If \`i\` equals the pattern length, we have used every character: the answer is the end flag of the current node.
2. If \`pattern[i]\` is a letter, follow that one child (or fail if it is missing).
3. If \`pattern[i]\` is \`.\`, try **each child** in turn; succeed as soon as one of them succeeds.

📌 **Interview term: Wildcard** — a pattern character that stands for "any one character". Here it is \`.\`, as in regular expressions.

📌 **Interview term: Depth-first search (DFS)** — explore one branch all the way down before trying the next. The wildcard search is a DFS over the trie; see [depth-first search](/interview-question/what-is-the-difference-between-bfs-and-dfs).

📌 **Interview term: Short-circuit** — stop exploring as soon as the answer is known. A yes/no search returns \`true\` on the first full match instead of visiting the remaining branches.

Here is the search for \`.ad\` in a trie with *bad, dad, mad*:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 340" role="img" aria-label="Searching dot a d in a trie holding bad, dad and mad. At the dot the search tries every child of the root and the first branch b a d succeeds">
  <path class="d-edge-accent" d="M 335 58 L 190 112"/>
  <path class="d-edge-dashed" d="M 340 60 L 340 110"/>
  <path class="d-edge-dashed" d="M 345 58 L 490 112"/>
  <path class="d-edge-accent" d="M 180 150 L 180 190"/>
  <path class="d-edge" d="M 340 150 L 340 190"/>
  <path class="d-edge" d="M 500 150 L 500 190"/>
  <path class="d-edge-accent" d="M 180 230 L 180 270"/>
  <path class="d-edge" d="M 340 230 L 340 270"/>
  <path class="d-edge" d="M 500 230 L 500 270"/>
  <circle class="d-box-muted" cx="340" cy="40" r="20"/>
  <text class="d-sub" x="340" y="45" text-anchor="middle">root</text>
  <circle class="d-box-accent" cx="180" cy="130" r="20"/>
  <text class="d-text" x="180" y="136" text-anchor="middle">b</text>
  <circle class="d-box" cx="340" cy="130" r="20"/>
  <text class="d-text" x="340" y="136" text-anchor="middle">d</text>
  <circle class="d-box" cx="500" cy="130" r="20"/>
  <text class="d-text" x="500" y="136" text-anchor="middle">m</text>
  <circle class="d-box-accent" cx="180" cy="210" r="20"/>
  <text class="d-text" x="180" y="216" text-anchor="middle">a</text>
  <circle class="d-box" cx="340" cy="210" r="20"/>
  <text class="d-text" x="340" y="216" text-anchor="middle">a</text>
  <circle class="d-box" cx="500" cy="210" r="20"/>
  <text class="d-text" x="500" y="216" text-anchor="middle">a</text>
  <circle class="d-box-accent" cx="180" cy="290" r="20"/>
  <text class="d-text" x="180" y="296" text-anchor="middle">d</text>
  <circle class="d-box" cx="340" cy="290" r="20"/>
  <text class="d-text" x="340" y="296" text-anchor="middle">d</text>
  <circle class="d-box" cx="500" cy="290" r="20"/>
  <text class="d-text" x="500" y="296" text-anchor="middle">d</text>
  <text class="d-sub" x="560" y="45">dot: try each child</text>
  <text class="d-sub" x="560" y="216">a: one child only</text>
  <text class="d-sub" x="560" y="296">d: end flag, match</text>
  <text class="d-sub" x="40" y="136">tried first</text>
</svg>

At the root the pattern says \`.\`, so all three children are candidates. The search tries **b** first, then has no choice for "a" and "d", reaches an end flag and returns true. The **d** and **m** branches (dashed) are never entered because of the short-circuit. This is [backtracking](/interview-question/what-is-backtracking) in its simplest form: try a choice, and if it fails, return and try the next one.

📌 **Interview term: Branching factor** — how many children a node can have, at most the alphabet size Σ. Each dot multiplies the number of paths by up to Σ, which is why dot-heavy patterns are the expensive case.

## 4. Autocomplete: Walk the Prefix, Then List the Subtree

Every word that starts with a prefix lives in the subtree under the prefix node. So autocomplete has two phases:

<svg class="iq-diagram" width="100%" viewBox="0 0 780 150" role="img" aria-label="Autocomplete in four steps: walk the typed prefix, take the subtree under it, list words with a preorder DFS in letter order, stop after k words">
  <defs>
    <marker id="b18q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="10" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="90" y="70" text-anchor="middle">walk the prefix</text>
  <text class="d-sub" x="90" y="92" text-anchor="middle">m, o, u</text>
  <path class="d-edge" d="M 172 75 L 212 75" marker-end="url(#b18q2-arrow)"/>
  <rect class="d-box-muted" x="216" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="296" y="70" text-anchor="middle">subtree of u</text>
  <text class="d-sub" x="296" y="92" text-anchor="middle">every match lives here</text>
  <path class="d-edge" d="M 378 75 L 418 75" marker-end="url(#b18q2-arrow)"/>
  <rect class="d-box-accent" x="422" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="502" y="70" text-anchor="middle">preorder DFS</text>
  <text class="d-sub" x="502" y="92" text-anchor="middle">letters a to z</text>
  <path class="d-edge" d="M 584 75 L 624 75" marker-end="url(#b18q2-arrow)"/>
  <rect class="d-box-accent" x="628" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="698" y="70" text-anchor="middle">stop at k</text>
  <text class="d-sub" x="698" y="92" text-anchor="middle">mouse, mousepad</text>
</svg>

The DFS in phase two visits children **in letter order** and records a word **before** its extensions, so "mouse" comes before "mousepad". That is a preorder traversal, and it produces words in exact alphabetical order — no sorting of the results is needed. Stopping once \`k\` words are collected keeps each keystroke cheap.

📌 **Interview term: Preorder traversal** — visit a node before its children. On a trie with children in letter order, preorder lists words alphabetically.

📌 **Interview term: Top-k suggestions** — return only the first k results (here the alphabetically smallest). With popularity ranking you would store a count per word and keep the best k with a heap.

The two ideas combine: if the typed prefix itself contains dots (\`mo.i\`), phase one becomes the wildcard walk — it can end at **several** nodes — and phase two collects from each of them in order. Example 2 does this and finds *mobile* and *monitor*.

## 5. Brute Force First, and Why the Trie Wins

The obvious solution keeps the words in a list. To answer \`search(pattern)\`, compare the pattern with every word of the same length, letter by letter, treating \`.\` as "anything". That is **O(N · L)** per query for N words of length L, every time. For autocomplete you would scan the whole list on every keystroke.

The trie pays for its structure once, at insert time. After that:

- a pattern **without** dots costs O(L): one child per letter;
- a pattern **with** dots only branches where the dots are, and only into children that actually exist;
- autocomplete costs O(length of prefix) to find the subtree, plus the work to list the first k words.

The honest caveat is the worst case: a pattern made almost entirely of dots that matches nothing forces the search to visit nearly every node at those depths. Example 2 measures it on 5,000 random words (the same trie as on the trie page, 7,649 nodes below the root): \`abcd\` visited 5 nodes, but \`.......x\` visited **6,804** nodes before answering false, because the \`x\` at the end can never match a word made of a–e letters. If such queries are common, a hash map from word length to the list of words is a reasonable alternative for them.

## 6. The Code in JavaScript

The JavaScript version stores children in a \`Map\`. The search is an arrow function \`dfs(node, i)\` defined inside \`search\`, so it closes over \`pattern\`. At a dot it loops over \`node.children.values()\` and returns \`true\` from inside the loop as soon as one branch matches — that early \`return\` is the short-circuit.

~~~javascript
class WordDictionary {
  constructor() {
    this.root = new Node();
  }

  addWord(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, new Node());
      node = node.children.get(ch);
    }
    node.isEnd = true;
  }

  // '.' matches any one letter. DFS: branch only at a dot.
  search(pattern) {
    const dfs = (node, i) => {
      if (i === pattern.length) return node.isEnd;
      const ch = pattern[i];
      if (ch === ".") {
        for (const child of node.children.values()) {
          if (dfs(child, i + 1)) return true; // stop at the first match
        }
        return false;
      }
      const child = node.children.get(ch);
      return child !== undefined && dfs(child, i + 1);
    };
    return dfs(this.root, 0);
  }
}
~~~

**What to point out in this code:**

- The base case \`i === pattern.length\` returns \`node.isEnd\`, so \`search("b.")\` is false even though the path b → a exists: "ba" was never inserted.
- \`pattern[i]\` indexes UTF-16 code units. For a–z words that is the same as characters; for emoji you would split the pattern with \`[...pattern]\` first.
- \`node.children.get(ch)\` returns \`undefined\` for a missing letter, and the code compares with \`!== undefined\` so the function always returns a real boolean.
- The recursion depth equals the pattern length; the maximum call-stack depth in JavaScript depends on the engine and is not set by the language, so very long patterns are better handled with an explicit stack.

For autocomplete, \`collect\` is the preorder DFS. \`[...node.children.keys()].sort()\` is needed because a \`Map\` iterates in **insertion** order, and the default \`sort()\` compares strings, which is exactly alphabetical for single letters (it would be wrong for numbers: \`[10, 9, 1].sort()\` gives \`[1, 10, 9]\`).

~~~javascript
// Preorder DFS in alphabetical order: words come out sorted.
collect(node, path, out, k) {
  if (out.length === k) return;
  if (node.isEnd) out.push(path);
  for (const ch of [...node.children.keys()].sort()) {
    this.collect(node.children.get(ch), path + ch, out, k);
  }
}

suggest(prefix, k = 3) {
  let node = this.root;
  for (const ch of prefix) {
    node = node.children.get(ch);
    if (node === undefined) return [];
  }
  const out = [];
  this.collect(node, prefix, out, k);
  return out;
}
~~~

## 7. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22; the same file runs unchanged in the page). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. To make the node counts identical across languages, every version tries a dot's children in alphabetical order.

**Example 1 — add and search with \`.\` (the LeetCode 211 cases plus a few edge cases)** prints:

~~~text
false
true
true
true
true
false
true
false
true
false
~~~

\`"...."\` is false because no four-letter word exists; \`"."\` is true only because "a" was added; \`"b."\` is false because "ba" is a path but not a word; \`""\` is false because the root is not a word end.

**Example 2 — per-keystroke suggestions, wildcard autocomplete, and the cost of dots** prints:

~~~text
m     [mobile, moneypot, monitor]
mo    [mobile, moneypot, monitor]
mou   [mouse, mousepad]
mous  [mouse, mousepad]
mouse [mouse, mousepad]
mo.i  [mobile, monitor]
..u   [mouse, mousepad]
x     []
search abcd     true  nodes visited 5
search abcdx    false nodes visited 5
search a..d     true  nodes visited 7
search ........ true  nodes visited 9
search .......x false nodes visited 6804
~~~

Reading it: typing "mouse" one letter at a time returns at most three alphabetical suggestions per keystroke; \`mo.i\` finds *mobile* and *monitor* through the wildcard walk; and on the 5,000-word trie a pattern with no dots or few dots costs a handful of nodes, while \`.......x\` — seven dots and an impossible last letter — visits 6,804 nodes to prove there is no match.

## 8. Complexity

L = word or pattern length, d = number of dots, Σ = alphabet size, N = number of words, k = suggestions wanted.

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`addWord\` | O(L) | one step per character |
| \`search\` without dots | O(L) | one child per letter |
| \`search\` with d dots | O(Σ^d · L) worst case, and never more than the number of trie nodes at depth ≤ L | each dot fans out to at most Σ existing children |
| \`suggest(prefix, k)\` | O(L + nodes visited until k words are found) | walk the prefix, then a DFS that stops at k |
| Brute force over a list | O(N · L) per query | compare against every word |

| Space | Bound | Why |
| :--- | :--- | :--- |
| Trie | O(total characters) nodes | one node per distinct prefix |
| Search recursion | O(L) stack frames | one frame per pattern position (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)) |

In JavaScript, \`[...keys].sort()\` adds O(c log c) per visited node for c children (at most 26 here).

## 9. Edge Cases

- **Empty pattern** — true only if the empty word was added (example 1 prints false).
- **Pattern longer than every word** (\`"...."\`) — the walk runs out of children and returns false.
- **A path that is not a word** (\`"b."\` when only "bad" exists) — the end flag, not the existence of the node, decides.
- **A single dot** — true only if some one-letter word exists ("a" in example 1).
- **No suggestions** — a prefix that leaves the trie (\`"x"\`) returns an empty list, not an error.
- **All dots and no match** (\`".......x"\`) — the worst case; the search must try every branch (6,804 nodes in example 2).

## Common Pitfalls

- **Using \`forEach\` for the dot branch.** You cannot \`return\` out of \`forEach\`, so the short-circuit is lost; use \`for...of\` (as here) or \`some\`.
- **Checking "node exists" instead of \`isEnd\` at the end of the pattern.** Then \`search("b.")\` wrongly returns \`true\`.
- **Returning \`undefined\` instead of \`false\`.** \`child && dfs(...)\` returns \`undefined\` for a missing child; compare explicitly so callers get a boolean.
- **Plain objects as child maps.** Integer-like keys are reordered and prototype keys can leak into \`in\` checks; a \`Map\` avoids both.
- **Building suggestions with \`pattern.slice(1)\` on every call.** Each slice copies the string; pass an index.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The structure:</strong> <span style="color:#f0e2c8;">A trie: one child per letter and an end-of-word flag. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addWord</code> is a normal O(L) insert.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The wildcard:</strong> <span style="color:#f0e2c8;">Search recursively with an index. A letter follows one child; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.</code> tries every child and returns true on the first success.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Autocomplete:</strong> <span style="color:#f0e2c8;">Walk the prefix, then a preorder DFS with children in letter order; stop after k words. The output is already alphabetical.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(L) without dots; with d dots up to Σ^d paths, bounded by the trie size. All-dot misses are the worst case — 6804 nodes in our run vs 5 for a plain word.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">Children in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>; return early from a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for...of</code> loop (not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forEach</code>) for the short-circuit; sort the keys for alphabetical suggestions.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a RegExp over the word list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new RegExp('^' + pattern + '$')</code> works for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.</code> but tests every word: O(N·L) per query. The trie only explores branches that exist.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you rank by popularity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store a count per word and keep the best k (a small heap, or sort the candidates), or cache a top-k array on each node at insert time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">forEach</code> for the dot?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code> inside the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forEach</code> callback only leaves the callback, so every child is still visited. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for...of</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">some</code> can stop early.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">*</code> matches zero or more letters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Branch two ways at a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code>: skip it, or consume one letter and stay on the star. Memoise on node and index.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a debounced search box?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The trie query per keystroke is O(prefix length + k), so it is cheap; debouncing protects the network or rendering, not the trie.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Wildcard** | A pattern character (here \`.\`) that matches any one character |
| **Depth-first search (DFS)** | Explore one branch fully before the next |
| **Short-circuit** | Stop as soon as the answer is known |
| **Branching factor** | The number of children a node can have; a dot fans out to all of them |
| **Preorder traversal** | Visit a node before its children; on a sorted trie it lists words alphabetically |
| **Top-k suggestions** | Return only the first k results |

---
**Conclusion:** Autocomplete and wildcard search are the same trie read two ways. \`addWord\` is a normal O(L) insert; \`search\` is a recursive walk that follows one child per letter and tries every child at a \`.\`, returning early from a \`for...of\` loop on the first match; \`suggest\` walks the prefix and lists the subtree with a preorder DFS over sorted \`Map\` keys. The cost is O(L) for plain words and grows with the number of dots — our all-dot miss visited 6,804 nodes — so say that out loud and mention length buckets for dot-heavy workloads.`,
        examples: [
          {
            label: `addWord and search with '.' wildcards`,
            code: `class Node {
  constructor() {
    this.children = new Map();
    this.isEnd = false;
  }
}

class WordDictionary {
  constructor() {
    this.root = new Node();
  }

  addWord(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, new Node());
      node = node.children.get(ch);
    }
    node.isEnd = true;
  }

  // '.' matches any one letter. DFS: branch only at a dot.
  search(pattern) {
    const dfs = (node, i) => {
      if (i === pattern.length) return node.isEnd;
      const ch = pattern[i];
      if (ch === ".") {
        for (const child of node.children.values()) {
          if (dfs(child, i + 1)) return true; // stop at the first match
        }
        return false;
      }
      const child = node.children.get(ch);
      return child !== undefined && dfs(child, i + 1);
    };
    return dfs(this.root, 0);
  }
}

const d = new WordDictionary();
for (const w of ["bad", "dad", "mad", "a"]) d.addWord(w);

console.log(d.search("pad")); // false
console.log(d.search("bad")); // true
console.log(d.search(".ad")); // true
console.log(d.search("b..")); // true
console.log(d.search("...")); // true
console.log(d.search("....")); // false
console.log(d.search(".")); // true
console.log(d.search("b.")); // false
console.log(d.search("..d")); // true
console.log(d.search("")); // false`,
          },
          {
            label: `Autocomplete per keystroke, wildcard prefixes, cost of dots`,
            code: `class Node {
  constructor() {
    this.children = new Map();
    this.isEnd = false;
  }
}

class Autocomplete {
  constructor(words) {
    this.root = new Node();
    this.visited = 0;
    for (const w of words) {
      let node = this.root;
      for (const ch of w) {
        if (!node.children.has(ch)) node.children.set(ch, new Node());
        node = node.children.get(ch);
      }
      node.isEnd = true;
    }
  }

  // Preorder DFS in alphabetical order: words come out sorted.
  collect(node, path, out, k) {
    if (out.length === k) return;
    if (node.isEnd) out.push(path);
    for (const ch of [...node.children.keys()].sort()) {
      this.collect(node.children.get(ch), path + ch, out, k);
    }
  }

  suggest(prefix, k = 3) {
    let node = this.root;
    for (const ch of prefix) {
      node = node.children.get(ch);
      if (node === undefined) return [];
    }
    const out = [];
    this.collect(node, prefix, out, k);
    return out;
  }

  // Autocomplete where the typed prefix may contain '.' wildcards.
  suggestPattern(pattern, k = 10) {
    const out = [];
    const walk = (node, i, path) => {
      if (out.length === k) return;
      if (i === pattern.length) {
        this.collect(node, path, out, k);
        return;
      }
      const ch = pattern[i];
      const options = ch === "." ? [...node.children.keys()].sort() : [ch];
      for (const c of options) {
        if (node.children.has(c)) walk(node.children.get(c), i + 1, path + c);
      }
    };
    walk(this.root, 0, "");
    return out;
  }

  // Exact match with '.'; counts every node the DFS enters.
  search(pattern) {
    const dfs = (node, i) => {
      this.visited++;
      if (i === pattern.length) return node.isEnd;
      if (pattern[i] === ".") {
        // sorted so every language tries children in the same order
        for (const c of [...node.children.keys()].sort()) {
          if (dfs(node.children.get(c), i + 1)) return true;
        }
        return false;
      }
      const child = node.children.get(pattern[i]);
      return child !== undefined && dfs(child, i + 1);
    };
    this.visited = 0;
    return dfs(this.root, 0);
  }
}

const fmt = (xs) => "[" + xs.join(", ") + "]";

const ac = new Autocomplete(["mobile", "mouse", "moneypot", "monitor", "mousepad"]);
let typed = "";
for (const ch of "mouse") {
  typed += ch;
  console.log(typed.padEnd(6) + fmt(ac.suggest(typed)));
}
console.log("mo.i  " + fmt(ac.suggestPattern("mo.i")));
console.log("..u   " + fmt(ac.suggestPattern("..u")));
console.log("x     " + fmt(ac.suggest("x")));

let seed = 7;
const nxt = () => (seed = (seed * 48271) % 2147483647);
const words = [];
for (let i = 0; i < 5000; i++) {
  const n = 3 + (nxt() % 6);
  let w = "";
  for (let j = 0; j < n; j++) w += String.fromCharCode(97 + (nxt() % 5));
  words.push(w);
}
const big = new Autocomplete(words);
for (const p of ["abcd", "abcdx", "a..d", "........", ".......x"]) {
  const found = big.search(p);
  console.log("search " + p.padEnd(9) + String(found).padEnd(6) + "nodes visited " + big.visited);
}`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Design a word dictionary in Java with \`addWord(word)\` and \`search(pattern)\`, where a \`.\` in the pattern matches any single letter. Then extend it to autocomplete: as the user types, return up to three suggestions in alphabetical order. What does a search cost when the pattern has many dots?"

**What a strong answer should cover:**
- A trie with an end-of-word flag; \`addWord\` is an O(L) insert.
- A recursive search with an index: one child for a letter, every child for a \`.\`, the end flag at the end, and an early return on the first match.
- Autocomplete as "walk the prefix, then a preorder DFS in letter order that stops after k words", which yields alphabetical results without sorting.
- Honest complexity: O(L) without dots, up to Σ^d paths with d dots (bounded by the trie size); a brute-force list scan is O(N·L) per query.
- Java details: \`Node[26]\` children indexed by \`ch - 'a'\` (alphabetical for free, throws outside a–z), and a shared \`StringBuilder\` with \`setLength\` for the DFS path.

**Clarifying questions expected:**
- Does \`.\` match exactly one letter? Is there also a \`*\`?
- Should suggestions be alphabetical or ranked by popularity, and how many?
- Is the alphabet only lower-case a–z?

**Code / implementation expected:** Yes — a \`WordDictionary\`/trie class with \`addWord\`, \`search\` (with \`.\`) and a \`suggest(prefix, k)\` method, in Java.`,
        answer: `**Target Audience:** Developers who know what a trie is and want the classic design question — you need recursion and basic classes.  
**Difficulty:** Medium  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are stuck on a crossword. The clue is "angry", the answer has three letters, and you only know the last two: **_ a d**. You ask a friend with a dictionary to read you every three-letter word ending in "ad": bad, dad, fad, had, lad, mad, pad, sad… The friend does not read the whole dictionary. They flip to each starting letter in turn, check whether "?ad" exists under it, and move on.

That is exactly how a trie handles a wildcard. For ordinary letters there is only one way forward — follow that letter. At a **dot**, any letter will do, so the search tries **every child** and keeps going from each one. Autocomplete is the same tree used the other way round: walk the letters the user has typed, then read out the words that live underneath.

This question is a favourite (it is LeetCode 211, "Design Add and Search Words Data Structure", plus a search-suggestions twist) because it checks three things at once: can you build a trie, can you write a clean recursive search that branches only when it must, and can you reason about the worst case when the pattern is mostly dots.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does \`.\` match exactly one letter, never zero? | Exactly one keeps the search depth equal to the pattern length. A \`*\` that matches zero or more letters needs a different, branching recursion. |
| Do you want a yes/no (\`search\`) or the list of matching words? | Yes/no can stop at the first match; a list must explore every branch. |
| How should suggestions be ordered, and how many? | Alphabetical top-k falls out of a sorted DFS. "Most popular first" needs a count per word and a [heap](/interview-question/what-is-a-heap-priority-queue) or a cached top-k per node. |
| What is the alphabet? Only lower-case a–z? | Decides between a 26-slot array and a hash map for children, and how many branches a dot can open. |
| How many words, how long, and how many dots per query? | Mostly-dot patterns are the worst case; if they are common, grouping words by length may beat the trie. |
| Can words be deleted? | Deletion needs end-flag clearing and pruning of empty nodes. |

## 3. The Core Idea: Branch Only at a Dot

Start from a normal trie (if the structure is new to you, read [What is a trie and when is it useful?](/interview-question/what-is-a-trie-and-when-is-it-useful) first): one child per letter and an end-of-word flag. Adding a word is the usual insert. Searching a pattern is a **recursive walk** with the position \`i\` in the pattern:

1. If \`i\` equals the pattern length, we have used every character: the answer is the end flag of the current node.
2. If \`pattern[i]\` is a letter, follow that one child (or fail if it is missing).
3. If \`pattern[i]\` is \`.\`, try **each child** in turn; succeed as soon as one of them succeeds.

📌 **Interview term: Wildcard** — a pattern character that stands for "any one character". Here it is \`.\`, as in regular expressions.

📌 **Interview term: Depth-first search (DFS)** — explore one branch all the way down before trying the next. The wildcard search is a DFS over the trie; see [depth-first search](/interview-question/what-is-the-difference-between-bfs-and-dfs).

📌 **Interview term: Short-circuit** — stop exploring as soon as the answer is known. A yes/no search returns \`true\` on the first full match instead of visiting the remaining branches.

Here is the search for \`.ad\` in a trie with *bad, dad, mad*:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 340" role="img" aria-label="Searching dot a d in a trie holding bad, dad and mad. At the dot the search tries every child of the root and the first branch b a d succeeds">
  <path class="d-edge-accent" d="M 335 58 L 190 112"/>
  <path class="d-edge-dashed" d="M 340 60 L 340 110"/>
  <path class="d-edge-dashed" d="M 345 58 L 490 112"/>
  <path class="d-edge-accent" d="M 180 150 L 180 190"/>
  <path class="d-edge" d="M 340 150 L 340 190"/>
  <path class="d-edge" d="M 500 150 L 500 190"/>
  <path class="d-edge-accent" d="M 180 230 L 180 270"/>
  <path class="d-edge" d="M 340 230 L 340 270"/>
  <path class="d-edge" d="M 500 230 L 500 270"/>
  <circle class="d-box-muted" cx="340" cy="40" r="20"/>
  <text class="d-sub" x="340" y="45" text-anchor="middle">root</text>
  <circle class="d-box-accent" cx="180" cy="130" r="20"/>
  <text class="d-text" x="180" y="136" text-anchor="middle">b</text>
  <circle class="d-box" cx="340" cy="130" r="20"/>
  <text class="d-text" x="340" y="136" text-anchor="middle">d</text>
  <circle class="d-box" cx="500" cy="130" r="20"/>
  <text class="d-text" x="500" y="136" text-anchor="middle">m</text>
  <circle class="d-box-accent" cx="180" cy="210" r="20"/>
  <text class="d-text" x="180" y="216" text-anchor="middle">a</text>
  <circle class="d-box" cx="340" cy="210" r="20"/>
  <text class="d-text" x="340" y="216" text-anchor="middle">a</text>
  <circle class="d-box" cx="500" cy="210" r="20"/>
  <text class="d-text" x="500" y="216" text-anchor="middle">a</text>
  <circle class="d-box-accent" cx="180" cy="290" r="20"/>
  <text class="d-text" x="180" y="296" text-anchor="middle">d</text>
  <circle class="d-box" cx="340" cy="290" r="20"/>
  <text class="d-text" x="340" y="296" text-anchor="middle">d</text>
  <circle class="d-box" cx="500" cy="290" r="20"/>
  <text class="d-text" x="500" y="296" text-anchor="middle">d</text>
  <text class="d-sub" x="560" y="45">dot: try each child</text>
  <text class="d-sub" x="560" y="216">a: one child only</text>
  <text class="d-sub" x="560" y="296">d: end flag, match</text>
  <text class="d-sub" x="40" y="136">tried first</text>
</svg>

At the root the pattern says \`.\`, so all three children are candidates. The search tries **b** first, then has no choice for "a" and "d", reaches an end flag and returns true. The **d** and **m** branches (dashed) are never entered because of the short-circuit. This is [backtracking](/interview-question/what-is-backtracking) in its simplest form: try a choice, and if it fails, return and try the next one.

📌 **Interview term: Branching factor** — how many children a node can have, at most the alphabet size Σ. Each dot multiplies the number of paths by up to Σ, which is why dot-heavy patterns are the expensive case.

## 4. Autocomplete: Walk the Prefix, Then List the Subtree

Every word that starts with a prefix lives in the subtree under the prefix node. So autocomplete has two phases:

<svg class="iq-diagram" width="100%" viewBox="0 0 780 150" role="img" aria-label="Autocomplete in four steps: walk the typed prefix, take the subtree under it, list words with a preorder DFS in letter order, stop after k words">
  <defs>
    <marker id="b18q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="10" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="90" y="70" text-anchor="middle">walk the prefix</text>
  <text class="d-sub" x="90" y="92" text-anchor="middle">m, o, u</text>
  <path class="d-edge" d="M 172 75 L 212 75" marker-end="url(#b18q2-arrow)"/>
  <rect class="d-box-muted" x="216" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="296" y="70" text-anchor="middle">subtree of u</text>
  <text class="d-sub" x="296" y="92" text-anchor="middle">every match lives here</text>
  <path class="d-edge" d="M 378 75 L 418 75" marker-end="url(#b18q2-arrow)"/>
  <rect class="d-box-accent" x="422" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="502" y="70" text-anchor="middle">preorder DFS</text>
  <text class="d-sub" x="502" y="92" text-anchor="middle">letters a to z</text>
  <path class="d-edge" d="M 584 75 L 624 75" marker-end="url(#b18q2-arrow)"/>
  <rect class="d-box-accent" x="628" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="698" y="70" text-anchor="middle">stop at k</text>
  <text class="d-sub" x="698" y="92" text-anchor="middle">mouse, mousepad</text>
</svg>

The DFS in phase two visits children **in letter order** and records a word **before** its extensions, so "mouse" comes before "mousepad". That is a preorder traversal, and it produces words in exact alphabetical order — no sorting of the results is needed. Stopping once \`k\` words are collected keeps each keystroke cheap.

📌 **Interview term: Preorder traversal** — visit a node before its children. On a trie with children in letter order, preorder lists words alphabetically.

📌 **Interview term: Top-k suggestions** — return only the first k results (here the alphabetically smallest). With popularity ranking you would store a count per word and keep the best k with a heap.

The two ideas combine: if the typed prefix itself contains dots (\`mo.i\`), phase one becomes the wildcard walk — it can end at **several** nodes — and phase two collects from each of them in order. Example 2 does this and finds *mobile* and *monitor*.

## 5. Brute Force First, and Why the Trie Wins

The obvious solution keeps the words in a list. To answer \`search(pattern)\`, compare the pattern with every word of the same length, letter by letter, treating \`.\` as "anything". That is **O(N · L)** per query for N words of length L, every time. For autocomplete you would scan the whole list on every keystroke.

The trie pays for its structure once, at insert time. After that:

- a pattern **without** dots costs O(L): one child per letter;
- a pattern **with** dots only branches where the dots are, and only into children that actually exist;
- autocomplete costs O(length of prefix) to find the subtree, plus the work to list the first k words.

The honest caveat is the worst case: a pattern made almost entirely of dots that matches nothing forces the search to visit nearly every node at those depths. Example 2 measures it on 5,000 random words (the same trie as on the trie page, 7,649 nodes below the root): \`abcd\` visited 5 nodes, but \`.......x\` visited **6,804** nodes before answering false, because the \`x\` at the end can never match a word made of a–e letters. If such queries are common, a hash map from word length to the list of words is a reasonable alternative for them.

## 6. The Code in Java

The Java version uses a \`Node[] children = new Node[26]\` array. \`search\` delegates to a private recursive \`dfs(node, pattern, i)\`. At a dot the enhanced \`for\` loop walks all 26 slots, skips \`null\` ones, and returns \`true\` from inside the loop on the first match.

~~~java
static class WordDictionary {
    private final Node root = new Node();

    void addWord(String word) {
        Node node = root;
        for (char ch : word.toCharArray()) {
            int c = ch - 'a';
            if (node.children[c] == null) node.children[c] = new Node();
            node = node.children[c];
        }
        node.isEnd = true;
    }

    // '.' matches any one letter. DFS: branch only at a dot.
    boolean search(String pattern) {
        return dfs(root, pattern, 0);
    }

    private boolean dfs(Node node, String p, int i) {
        if (i == p.length()) return node.isEnd;
        char ch = p.charAt(i);
        if (ch == '.') {
            for (Node child : node.children) {
                if (child != null && dfs(child, p, i + 1)) return true; // first match wins
            }
            return false;
        }
        Node child = node.children[ch - 'a'];
        return child != null && dfs(child, p, i + 1);
    }
}
~~~

**What to point out in this code:**

- The base case \`i == p.length()\` returns \`node.isEnd\`, so \`search("b.")\` is false even though the path b → a exists: "ba" was never inserted.
- \`p.charAt(i) == '.'\` compares \`char\` values with \`==\`, which is correct for primitives (unlike \`String\`, where \`==\` compares references).
- \`ch - 'a'\` assumes lower-case letters; a pattern like \`"B.d"\` would throw \`ArrayIndexOutOfBoundsException\`. Validate or lower-case input.
- The recursion is as deep as the pattern; a pattern of tens of thousands of characters could throw \`StackOverflowError\` with the default thread stack.

For autocomplete, \`collect\` is the preorder DFS. The 26-slot array gives alphabetical order for free. One \`StringBuilder\` is shared by the whole DFS: append a letter, recurse, then \`setLength(length - 1)\` to undo it — no new \`String\` until a word is actually recorded.

~~~java
// Preorder DFS in alphabetical order: words come out sorted.
void collect(Node node, StringBuilder path, List<String> out, int k) {
    if (out.size() == k) return;
    if (node.isEnd) out.add(path.toString());
    for (int c = 0; c < 26; c++) {
        if (node.children[c] == null) continue;
        path.append((char) ('a' + c));
        collect(node.children[c], path, out, k);
        path.setLength(path.length() - 1);
    }
}

List<String> suggest(String prefix, int k) {
    List<String> out = new ArrayList<>();
    Node node = root;
    for (char ch : prefix.toCharArray()) {
        if (ch < 'a' || ch > 'z' || (node = node.children[ch - 'a']) == null) return out;
    }
    collect(node, new StringBuilder(prefix), out, k);
    return out;
}
~~~

## 7. Verified: Running the Code

Each example was saved as one file and run with \`javac Main.java && java Main\` (JDK 21, compiled as Java 17+ source). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. To make the node counts identical across languages, every version tries a dot's children in alphabetical order.

**Example 1 — add and search with \`.\` (the LeetCode 211 cases plus a few edge cases)** prints:

~~~text
false
true
true
true
true
false
true
false
true
false
~~~

\`"...."\` is false because no four-letter word exists; \`"."\` is true only because "a" was added; \`"b."\` is false because "ba" is a path but not a word; \`""\` is false because the root is not a word end.

**Example 2 — per-keystroke suggestions, wildcard autocomplete, and the cost of dots** prints:

~~~text
m     [mobile, moneypot, monitor]
mo    [mobile, moneypot, monitor]
mou   [mouse, mousepad]
mous  [mouse, mousepad]
mouse [mouse, mousepad]
mo.i  [mobile, monitor]
..u   [mouse, mousepad]
x     []
search abcd     true  nodes visited 5
search abcdx    false nodes visited 5
search a..d     true  nodes visited 7
search ........ true  nodes visited 9
search .......x false nodes visited 6804
~~~

Reading it: typing "mouse" one letter at a time returns at most three alphabetical suggestions per keystroke; \`mo.i\` finds *mobile* and *monitor* through the wildcard walk; and on the 5,000-word trie a pattern with no dots or few dots costs a handful of nodes, while \`.......x\` — seven dots and an impossible last letter — visits 6,804 nodes to prove there is no match.

## 8. Complexity

L = word or pattern length, d = number of dots, Σ = alphabet size, N = number of words, k = suggestions wanted.

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`addWord\` | O(L) | one step per character |
| \`search\` without dots | O(L) | one child per letter |
| \`search\` with d dots | O(Σ^d · L) worst case, and never more than the number of trie nodes at depth ≤ L | each dot fans out to at most Σ existing children |
| \`suggest(prefix, k)\` | O(L + nodes visited until k words are found) | walk the prefix, then a DFS that stops at k |
| Brute force over a list | O(N · L) per query | compare against every word |

| Space | Bound | Why |
| :--- | :--- | :--- |
| Trie | O(total characters) nodes | one node per distinct prefix |
| Search recursion | O(L) stack frames | one frame per pattern position (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)) |

In Java, scanning a 26-slot array costs 26 steps per visited node even when it has one child; that is a constant, but a real one.

## 9. Edge Cases

- **Empty pattern** — true only if the empty word was added (example 1 prints false).
- **Pattern longer than every word** (\`"...."\`) — the walk runs out of children and returns false.
- **A path that is not a word** (\`"b."\` when only "bad" exists) — the end flag, not the existence of the node, decides.
- **A single dot** — true only if some one-letter word exists ("a" in example 1).
- **No suggestions** — a prefix that leaves the trie (\`"x"\`) returns an empty list, not an error.
- **All dots and no match** (\`".......x"\`) — the worst case; the search must try every branch (6,804 nodes in example 2).

## Common Pitfalls

- **Comparing \`String\`s with \`==\`.** Fine for the \`char\` \`'.'\`, wrong for whole words — use \`equals\`.
- **Checking "node exists" instead of \`isEnd\` at the end of the pattern.** Then \`search("b.")\` wrongly returns \`true\`.
- **\`HashMap\` children for alphabetical suggestions.** A \`HashMap\` has no defined iteration order; use the array or a \`TreeMap\`.
- **\`path + c\` string concatenation in the DFS.** Creates a new \`String\` per step; share a \`StringBuilder\` and undo with \`setLength\`.
- **\`List.of(...)\` results are immutable.** Fine for input, but calling \`add\` on one throws \`UnsupportedOperationException\` — collect suggestions into an \`ArrayList\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The structure:</strong> <span style="color:#f0e2c8;">A trie: one child per letter and an end-of-word flag. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addWord</code> is a normal O(L) insert.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The wildcard:</strong> <span style="color:#f0e2c8;">Search recursively with an index. A letter follows one child; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.</code> tries every child and returns true on the first success.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Autocomplete:</strong> <span style="color:#f0e2c8;">Walk the prefix, then a preorder DFS with children in letter order; stop after k words. The output is already alphabetical.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(L) without dots; with d dots up to Σ^d paths, bounded by the trie size. All-dot misses are the worst case — 6804 nodes in our run vs 5 for a plain word.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Node[26]</code> children give alphabetical order; one shared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StringBuilder</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setLength</code> for backtracking; validate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ch - 'a'</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">String.matches</code> over a list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It compiles a regex each call and tests every word: O(N·L) per query. The trie only explores branches that exist.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you rank by popularity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store a frequency per word; collect candidates and keep the best k in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PriorityQueue</code> (min-heap of size k), or cache a top-k list per node at insert time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Array or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">HashMap</code> children here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The array gives free alphabetical order and no boxing; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HashMap&lt;Character, Node&gt;</code> saves memory for sparse or large alphabets but needs sorting for suggestions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">*</code> matches zero or more letters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code>, recurse twice: skip it (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i + 1</code>) or consume one child letter and stay on the star. Memoise on node and index.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can this overflow the stack?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Recursion depth equals the pattern length, so only for extremely long patterns; an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ArrayDeque</code> stack removes the limit.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Wildcard** | A pattern character (here \`.\`) that matches any one character |
| **Depth-first search (DFS)** | Explore one branch fully before the next |
| **Short-circuit** | Stop as soon as the answer is known |
| **Branching factor** | The number of children a node can have; a dot fans out to all of them |
| **Preorder traversal** | Visit a node before its children; on a sorted trie it lists words alphabetically |
| **Top-k suggestions** | Return only the first k results |

---
**Conclusion:** Autocomplete and wildcard search are the same trie read two ways. \`addWord\` is a normal O(L) insert into \`Node[26]\` children; \`search\` is a recursive walk that follows one child per letter and tries all 26 slots at a \`.\`, returning on the first match; \`suggest\` walks the prefix and lists the subtree in array order with one shared \`StringBuilder\`. The cost is O(L) for plain words and grows with the number of dots — our all-dot miss visited 6,804 nodes — so say that out loud and mention length buckets for dot-heavy workloads.`,
        examples: [
          {
            label: `addWord and search with '.' wildcards`,
            code: `public class Main {
    static class Node {
        Node[] children = new Node[26];
        boolean isEnd;
    }

    static class WordDictionary {
        private final Node root = new Node();

        void addWord(String word) {
            Node node = root;
            for (char ch : word.toCharArray()) {
                int c = ch - 'a';
                if (node.children[c] == null) node.children[c] = new Node();
                node = node.children[c];
            }
            node.isEnd = true;
        }

        // '.' matches any one letter. DFS: branch only at a dot.
        boolean search(String pattern) {
            return dfs(root, pattern, 0);
        }

        private boolean dfs(Node node, String p, int i) {
            if (i == p.length()) return node.isEnd;
            char ch = p.charAt(i);
            if (ch == '.') {
                for (Node child : node.children) {
                    if (child != null && dfs(child, p, i + 1)) return true; // first match wins
                }
                return false;
            }
            Node child = node.children[ch - 'a'];
            return child != null && dfs(child, p, i + 1);
        }
    }

    public static void main(String[] args) {
        WordDictionary d = new WordDictionary();
        for (String w : new String[]{"bad", "dad", "mad", "a"}) d.addWord(w);

        System.out.println(d.search("pad"));   // false
        System.out.println(d.search("bad"));   // true
        System.out.println(d.search(".ad"));   // true
        System.out.println(d.search("b.."));   // true
        System.out.println(d.search("..."));   // true
        System.out.println(d.search("...."));  // false
        System.out.println(d.search("."));     // true
        System.out.println(d.search("b."));    // false
        System.out.println(d.search("..d"));   // true
        System.out.println(d.search(""));      // false
    }
}`,
          },
          {
            label: `Autocomplete per keystroke, wildcard prefixes, cost of dots`,
            code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    static class Node {
        Node[] children = new Node[26]; // index order = alphabetical order
        boolean isEnd;
    }

    static class Autocomplete {
        final Node root = new Node();
        int visited = 0;

        Autocomplete(List<String> words) {
            for (String w : words) {
                Node node = root;
                for (char ch : w.toCharArray()) {
                    if (node.children[ch - 'a'] == null) node.children[ch - 'a'] = new Node();
                    node = node.children[ch - 'a'];
                }
                node.isEnd = true;
            }
        }

        // Preorder DFS in alphabetical order: words come out sorted.
        void collect(Node node, StringBuilder path, List<String> out, int k) {
            if (out.size() == k) return;
            if (node.isEnd) out.add(path.toString());
            for (int c = 0; c < 26; c++) {
                if (node.children[c] == null) continue;
                path.append((char) ('a' + c));
                collect(node.children[c], path, out, k);
                path.setLength(path.length() - 1);
            }
        }

        List<String> suggest(String prefix, int k) {
            List<String> out = new ArrayList<>();
            Node node = root;
            for (char ch : prefix.toCharArray()) {
                if (ch < 'a' || ch > 'z' || (node = node.children[ch - 'a']) == null) return out;
            }
            collect(node, new StringBuilder(prefix), out, k);
            return out;
        }

        // Autocomplete where the typed prefix may contain '.' wildcards.
        List<String> suggestPattern(String pattern, int k) {
            List<String> out = new ArrayList<>();
            walk(root, pattern, 0, new StringBuilder(), out, k);
            return out;
        }

        void walk(Node node, String p, int i, StringBuilder path, List<String> out, int k) {
            if (out.size() == k) return;
            if (i == p.length()) {
                collect(node, path, out, k);
                return;
            }
            char ch = p.charAt(i);
            int lo = ch == '.' ? 0 : ch - 'a';
            int hi = ch == '.' ? 25 : ch - 'a';
            for (int c = lo; c <= hi; c++) {
                if (node.children[c] == null) continue;
                path.append((char) ('a' + c));
                walk(node.children[c], p, i + 1, path, out, k);
                path.setLength(path.length() - 1);
            }
        }

        // Exact match with '.'; counts every node the DFS enters.
        boolean search(String pattern) {
            visited = 0;
            return dfs(root, pattern, 0);
        }

        boolean dfs(Node node, String p, int i) {
            visited++;
            if (i == p.length()) return node.isEnd;
            char ch = p.charAt(i);
            if (ch == '.') {
                for (Node child : node.children) {
                    if (child != null && dfs(child, p, i + 1)) return true;
                }
                return false;
            }
            Node child = node.children[ch - 'a'];
            return child != null && dfs(child, p, i + 1);
        }
    }

    static String fmt(List<String> xs) {
        return "[" + String.join(", ", xs) + "]";
    }

    static long seed = 7;
    static int nxt() {
        seed = seed * 48271 % 2147483647L;
        return (int) seed;
    }

    public static void main(String[] args) {
        Autocomplete ac = new Autocomplete(List.of("mobile", "mouse", "moneypot", "monitor", "mousepad"));
        String typed = "";
        for (char ch : "mouse".toCharArray()) {
            typed += ch;
            System.out.println(String.format("%-6s", typed) + fmt(ac.suggest(typed, 3)));
        }
        System.out.println("mo.i  " + fmt(ac.suggestPattern("mo.i", 10)));
        System.out.println("..u   " + fmt(ac.suggestPattern("..u", 10)));
        System.out.println("x     " + fmt(ac.suggest("x", 3)));

        List<String> words = new ArrayList<>();
        for (int i = 0; i < 5000; i++) {
            int n = 3 + nxt() % 6;
            StringBuilder sb = new StringBuilder();
            for (int j = 0; j < n; j++) sb.append((char) ('a' + nxt() % 5));
            words.add(sb.toString());
        }
        Autocomplete big = new Autocomplete(words);
        for (String p : new String[]{"abcd", "abcdx", "a..d", "........", ".......x"}) {
            boolean found = big.search(p);
            System.out.println("search " + String.format("%-9s", p) + String.format("%-6s", found) + "nodes visited " + big.visited);
        }
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Design a word dictionary in C++ with \`addWord(word)\` and \`search(pattern)\`, where a \`.\` in the pattern matches any single letter. Then extend it to autocomplete: as the user types, return up to three suggestions in alphabetical order. What does a search cost when the pattern has many dots?"

**What a strong answer should cover:**
- A trie with an end-of-word flag; \`addWord\` is an O(L) insert.
- A recursive search with an index: one child for a letter, every child for a \`.\`, the end flag at the end, and an early return on the first match.
- Autocomplete as "walk the prefix, then a preorder DFS in letter order that stops after k words", which yields alphabetical results without sorting.
- Honest complexity: O(L) without dots, up to Σ^d paths with d dots (bounded by the trie size); a brute-force list scan is O(N·L) per query.
- C++ details: \`std::unique_ptr\` children, a \`const\` search, a \`std::string&\` path with \`push_back\`/\`pop_back\`, and checking the character range before \`ch - 'a'\` to avoid undefined behaviour.

**Clarifying questions expected:**
- Does \`.\` match exactly one letter? Is there also a \`*\`?
- Should suggestions be alphabetical or ranked by popularity, and how many?
- Is the alphabet only lower-case a–z?

**Code / implementation expected:** Yes — a \`WordDictionary\`/trie class with \`addWord\`, \`search\` (with \`.\`) and a \`suggest(prefix, k)\` method, in C++.`,
        answer: `**Target Audience:** Developers who know what a trie is and want the classic design question — you need recursion and basic classes.  
**Difficulty:** Medium  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

You are stuck on a crossword. The clue is "angry", the answer has three letters, and you only know the last two: **_ a d**. You ask a friend with a dictionary to read you every three-letter word ending in "ad": bad, dad, fad, had, lad, mad, pad, sad… The friend does not read the whole dictionary. They flip to each starting letter in turn, check whether "?ad" exists under it, and move on.

That is exactly how a trie handles a wildcard. For ordinary letters there is only one way forward — follow that letter. At a **dot**, any letter will do, so the search tries **every child** and keeps going from each one. Autocomplete is the same tree used the other way round: walk the letters the user has typed, then read out the words that live underneath.

This question is a favourite (it is LeetCode 211, "Design Add and Search Words Data Structure", plus a search-suggestions twist) because it checks three things at once: can you build a trie, can you write a clean recursive search that branches only when it must, and can you reason about the worst case when the pattern is mostly dots.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Does \`.\` match exactly one letter, never zero? | Exactly one keeps the search depth equal to the pattern length. A \`*\` that matches zero or more letters needs a different, branching recursion. |
| Do you want a yes/no (\`search\`) or the list of matching words? | Yes/no can stop at the first match; a list must explore every branch. |
| How should suggestions be ordered, and how many? | Alphabetical top-k falls out of a sorted DFS. "Most popular first" needs a count per word and a [heap](/interview-question/what-is-a-heap-priority-queue) or a cached top-k per node. |
| What is the alphabet? Only lower-case a–z? | Decides between a 26-slot array and a hash map for children, and how many branches a dot can open. |
| How many words, how long, and how many dots per query? | Mostly-dot patterns are the worst case; if they are common, grouping words by length may beat the trie. |
| Can words be deleted? | Deletion needs end-flag clearing and pruning of empty nodes. |

## 3. The Core Idea: Branch Only at a Dot

Start from a normal trie (if the structure is new to you, read [What is a trie and when is it useful?](/interview-question/what-is-a-trie-and-when-is-it-useful) first): one child per letter and an end-of-word flag. Adding a word is the usual insert. Searching a pattern is a **recursive walk** with the position \`i\` in the pattern:

1. If \`i\` equals the pattern length, we have used every character: the answer is the end flag of the current node.
2. If \`pattern[i]\` is a letter, follow that one child (or fail if it is missing).
3. If \`pattern[i]\` is \`.\`, try **each child** in turn; succeed as soon as one of them succeeds.

📌 **Interview term: Wildcard** — a pattern character that stands for "any one character". Here it is \`.\`, as in regular expressions.

📌 **Interview term: Depth-first search (DFS)** — explore one branch all the way down before trying the next. The wildcard search is a DFS over the trie; see [depth-first search](/interview-question/what-is-the-difference-between-bfs-and-dfs).

📌 **Interview term: Short-circuit** — stop exploring as soon as the answer is known. A yes/no search returns \`true\` on the first full match instead of visiting the remaining branches.

Here is the search for \`.ad\` in a trie with *bad, dad, mad*:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 340" role="img" aria-label="Searching dot a d in a trie holding bad, dad and mad. At the dot the search tries every child of the root and the first branch b a d succeeds">
  <path class="d-edge-accent" d="M 335 58 L 190 112"/>
  <path class="d-edge-dashed" d="M 340 60 L 340 110"/>
  <path class="d-edge-dashed" d="M 345 58 L 490 112"/>
  <path class="d-edge-accent" d="M 180 150 L 180 190"/>
  <path class="d-edge" d="M 340 150 L 340 190"/>
  <path class="d-edge" d="M 500 150 L 500 190"/>
  <path class="d-edge-accent" d="M 180 230 L 180 270"/>
  <path class="d-edge" d="M 340 230 L 340 270"/>
  <path class="d-edge" d="M 500 230 L 500 270"/>
  <circle class="d-box-muted" cx="340" cy="40" r="20"/>
  <text class="d-sub" x="340" y="45" text-anchor="middle">root</text>
  <circle class="d-box-accent" cx="180" cy="130" r="20"/>
  <text class="d-text" x="180" y="136" text-anchor="middle">b</text>
  <circle class="d-box" cx="340" cy="130" r="20"/>
  <text class="d-text" x="340" y="136" text-anchor="middle">d</text>
  <circle class="d-box" cx="500" cy="130" r="20"/>
  <text class="d-text" x="500" y="136" text-anchor="middle">m</text>
  <circle class="d-box-accent" cx="180" cy="210" r="20"/>
  <text class="d-text" x="180" y="216" text-anchor="middle">a</text>
  <circle class="d-box" cx="340" cy="210" r="20"/>
  <text class="d-text" x="340" y="216" text-anchor="middle">a</text>
  <circle class="d-box" cx="500" cy="210" r="20"/>
  <text class="d-text" x="500" y="216" text-anchor="middle">a</text>
  <circle class="d-box-accent" cx="180" cy="290" r="20"/>
  <text class="d-text" x="180" y="296" text-anchor="middle">d</text>
  <circle class="d-box" cx="340" cy="290" r="20"/>
  <text class="d-text" x="340" y="296" text-anchor="middle">d</text>
  <circle class="d-box" cx="500" cy="290" r="20"/>
  <text class="d-text" x="500" y="296" text-anchor="middle">d</text>
  <text class="d-sub" x="560" y="45">dot: try each child</text>
  <text class="d-sub" x="560" y="216">a: one child only</text>
  <text class="d-sub" x="560" y="296">d: end flag, match</text>
  <text class="d-sub" x="40" y="136">tried first</text>
</svg>

At the root the pattern says \`.\`, so all three children are candidates. The search tries **b** first, then has no choice for "a" and "d", reaches an end flag and returns true. The **d** and **m** branches (dashed) are never entered because of the short-circuit. This is [backtracking](/interview-question/what-is-backtracking) in its simplest form: try a choice, and if it fails, return and try the next one.

📌 **Interview term: Branching factor** — how many children a node can have, at most the alphabet size Σ. Each dot multiplies the number of paths by up to Σ, which is why dot-heavy patterns are the expensive case.

## 4. Autocomplete: Walk the Prefix, Then List the Subtree

Every word that starts with a prefix lives in the subtree under the prefix node. So autocomplete has two phases:

<svg class="iq-diagram" width="100%" viewBox="0 0 780 150" role="img" aria-label="Autocomplete in four steps: walk the typed prefix, take the subtree under it, list words with a preorder DFS in letter order, stop after k words">
  <defs>
    <marker id="b18q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="10" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="90" y="70" text-anchor="middle">walk the prefix</text>
  <text class="d-sub" x="90" y="92" text-anchor="middle">m, o, u</text>
  <path class="d-edge" d="M 172 75 L 212 75" marker-end="url(#b18q2-arrow)"/>
  <rect class="d-box-muted" x="216" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="296" y="70" text-anchor="middle">subtree of u</text>
  <text class="d-sub" x="296" y="92" text-anchor="middle">every match lives here</text>
  <path class="d-edge" d="M 378 75 L 418 75" marker-end="url(#b18q2-arrow)"/>
  <rect class="d-box-accent" x="422" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="502" y="70" text-anchor="middle">preorder DFS</text>
  <text class="d-sub" x="502" y="92" text-anchor="middle">letters a to z</text>
  <path class="d-edge" d="M 584 75 L 624 75" marker-end="url(#b18q2-arrow)"/>
  <rect class="d-box-accent" x="628" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="698" y="70" text-anchor="middle">stop at k</text>
  <text class="d-sub" x="698" y="92" text-anchor="middle">mouse, mousepad</text>
</svg>

The DFS in phase two visits children **in letter order** and records a word **before** its extensions, so "mouse" comes before "mousepad". That is a preorder traversal, and it produces words in exact alphabetical order — no sorting of the results is needed. Stopping once \`k\` words are collected keeps each keystroke cheap.

📌 **Interview term: Preorder traversal** — visit a node before its children. On a trie with children in letter order, preorder lists words alphabetically.

📌 **Interview term: Top-k suggestions** — return only the first k results (here the alphabetically smallest). With popularity ranking you would store a count per word and keep the best k with a heap.

The two ideas combine: if the typed prefix itself contains dots (\`mo.i\`), phase one becomes the wildcard walk — it can end at **several** nodes — and phase two collects from each of them in order. Example 2 does this and finds *mobile* and *monitor*.

## 5. Brute Force First, and Why the Trie Wins

The obvious solution keeps the words in a list. To answer \`search(pattern)\`, compare the pattern with every word of the same length, letter by letter, treating \`.\` as "anything". That is **O(N · L)** per query for N words of length L, every time. For autocomplete you would scan the whole list on every keystroke.

The trie pays for its structure once, at insert time. After that:

- a pattern **without** dots costs O(L): one child per letter;
- a pattern **with** dots only branches where the dots are, and only into children that actually exist;
- autocomplete costs O(length of prefix) to find the subtree, plus the work to list the first k words.

The honest caveat is the worst case: a pattern made almost entirely of dots that matches nothing forces the search to visit nearly every node at those depths. Example 2 measures it on 5,000 random words (the same trie as on the trie page, 7,649 nodes below the root): \`abcd\` visited 5 nodes, but \`.......x\` visited **6,804** nodes before answering false, because the \`x\` at the end can never match a word made of a–e letters. If such queries are common, a hash map from word length to the list of words is a reasonable alternative for them.

## 6. The Code in C++

The C++ version uses \`std::unique_ptr<Node> children[26]\`, so nodes are freed automatically. \`search\` is \`const\` and calls a \`static\` recursive helper \`dfs(node, pattern, i)\`. At a dot the range-\`for\` walks the 26 slots, skips empty ones, and returns \`true\` on the first match.

~~~cpp
class WordDictionary {
public:
    void addWord(const std::string& word) {
        Node* node = &root;
        for (char ch : word) {
            auto& child = node->children[ch - 'a'];
            if (!child) child = std::make_unique<Node>();
            node = child.get();
        }
        node->isEnd = true;
    }

    // '.' matches any one letter. DFS: branch only at a dot.
    bool search(const std::string& pattern) const { return dfs(&root, pattern, 0); }

private:
    Node root;

    static bool dfs(const Node* node, const std::string& p, size_t i) {
        if (i == p.size()) return node->isEnd;
        if (p[i] == '.') {
            for (const auto& child : node->children) {
                if (child && dfs(child.get(), p, i + 1)) return true; // first match wins
            }
            return false;
        }
        const Node* child = node->children[p[i] - 'a'].get();
        return child != nullptr && dfs(child, p, i + 1);
    }
};
~~~

**What to point out in this code:**

- The base case \`i == p.size()\` returns \`node->isEnd\`, so \`search("b.")\` is false even though the path b → a exists: "ba" was never inserted.
- \`size_t i\` matches \`std::string::size()\`, which avoids signed/unsigned comparison warnings.
- \`p[i] - 'a'\` for anything other than a–z or \`.\` is an out-of-range index: undefined behaviour, not an exception. The autocomplete code in example 2 checks the range before indexing.
- \`for (const auto& child : node->children)\` takes each \`unique_ptr\` by const reference; taking it by value would not compile, because \`unique_ptr\` cannot be copied.

For autocomplete, \`collect\` is the preorder DFS. The 26-slot array gives alphabetical order for free. One \`std::string&\` is shared by the whole DFS: \`push_back\` a letter, recurse, \`pop_back\` to undo it. The walk in \`suggest\` checks \`ch < 'a' || ch > 'z'\` **before** indexing, so a stray character returns no suggestions instead of reading out of bounds.

~~~cpp
std::vector<std::string> suggest(const std::string& prefix, size_t k) const {
    std::vector<std::string> out;
    const Node* node = &root;
    for (char ch : prefix) {
        if (ch < 'a' || ch > 'z' || !(node = node->children[ch - 'a'].get())) return out;
    }
    std::string path = prefix;
    collect(node, path, out, k);
    return out;
}

// Preorder DFS in alphabetical order: words come out sorted.
static void collect(const Node* node, std::string& path, std::vector<std::string>& out, size_t k) {
    if (out.size() == k) return;
    if (node->isEnd) out.push_back(path);
    for (int c = 0; c < 26; c++) {
        if (!node->children[c]) continue;
        path.push_back(static_cast<char>('a' + c));
        collect(node->children[c].get(), path, out, k);
        path.pop_back();
    }
}
~~~

## 7. Verified: Running the Code

Each example was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. To make the node counts identical across languages, every version tries a dot's children in alphabetical order.

**Example 1 — add and search with \`.\` (the LeetCode 211 cases plus a few edge cases)** prints:

~~~text
false
true
true
true
true
false
true
false
true
false
~~~

\`"...."\` is false because no four-letter word exists; \`"."\` is true only because "a" was added; \`"b."\` is false because "ba" is a path but not a word; \`""\` is false because the root is not a word end.

**Example 2 — per-keystroke suggestions, wildcard autocomplete, and the cost of dots** prints:

~~~text
m     [mobile, moneypot, monitor]
mo    [mobile, moneypot, monitor]
mou   [mouse, mousepad]
mous  [mouse, mousepad]
mouse [mouse, mousepad]
mo.i  [mobile, monitor]
..u   [mouse, mousepad]
x     []
search abcd     true  nodes visited 5
search abcdx    false nodes visited 5
search a..d     true  nodes visited 7
search ........ true  nodes visited 9
search .......x false nodes visited 6804
~~~

Reading it: typing "mouse" one letter at a time returns at most three alphabetical suggestions per keystroke; \`mo.i\` finds *mobile* and *monitor* through the wildcard walk; and on the 5,000-word trie a pattern with no dots or few dots costs a handful of nodes, while \`.......x\` — seven dots and an impossible last letter — visits 6,804 nodes to prove there is no match.

## 8. Complexity

L = word or pattern length, d = number of dots, Σ = alphabet size, N = number of words, k = suggestions wanted.

| Operation | Time | Why |
| :--- | :--- | :--- |
| \`addWord\` | O(L) | one step per character |
| \`search\` without dots | O(L) | one child per letter |
| \`search\` with d dots | O(Σ^d · L) worst case, and never more than the number of trie nodes at depth ≤ L | each dot fans out to at most Σ existing children |
| \`suggest(prefix, k)\` | O(L + nodes visited until k words are found) | walk the prefix, then a DFS that stops at k |
| Brute force over a list | O(N · L) per query | compare against every word |

| Space | Bound | Why |
| :--- | :--- | :--- |
| Trie | O(total characters) nodes | one node per distinct prefix |
| Search recursion | O(L) stack frames | one frame per pattern position (see [how much stack space recursion uses](/interview-question/what-is-space-complexity-and-how-much-stack-space-does-recursion-use)) |

In C++, scanning a 26-slot array costs 26 steps per visited node even when it has one child; that is a constant, but a real one.

## 9. Edge Cases

- **Empty pattern** — true only if the empty word was added (example 1 prints false).
- **Pattern longer than every word** (\`"...."\`) — the walk runs out of children and returns false.
- **A path that is not a word** (\`"b."\` when only "bad" exists) — the end flag, not the existence of the node, decides.
- **A single dot** — true only if some one-letter word exists ("a" in example 1).
- **No suggestions** — a prefix that leaves the trie (\`"x"\`) returns an empty list, not an error.
- **All dots and no match** (\`".......x"\`) — the worst case; the search must try every branch (6,804 nodes in example 2).

## Common Pitfalls

- **Indexing with \`p[i] - 'a'\` before checking the character.** Anything outside a–z (and not \`.\`) is undefined behaviour; check the range first.
- **Checking "node exists" instead of \`isEnd\` at the end of the pattern.** Then \`search("b.")\` wrongly returns \`true\`.
- **Passing \`std::string path\` by value in the DFS.** Copies the path at every level; pass by reference with \`push_back\`/\`pop_back\`.
- **Raw \`new Node()\` children.** Leaks the whole trie unless you write a destructor; \`std::unique_ptr\` frees it automatically.
- **Iterating \`std::unordered_map\` children for suggestions.** The order is unspecified; use the array or \`std::map\` for alphabetical output.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The structure:</strong> <span style="color:#f0e2c8;">A trie: one child per letter and an end-of-word flag. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">addWord</code> is a normal O(L) insert.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The wildcard:</strong> <span style="color:#f0e2c8;">Search recursively with an index. A letter follows one child; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.</code> tries every child and returns true on the first success.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Autocomplete:</strong> <span style="color:#f0e2c8;">Walk the prefix, then a preorder DFS with children in letter order; stop after k words. The output is already alphabetical.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">O(L) without dots; with d dots up to Σ^d paths, bounded by the trie size. All-dot misses are the worst case — 6804 nodes in our run vs 5 for a plain word.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::unique_ptr&lt;Node&gt;[26]</code> children; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::string&amp;</code> path with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">push_back</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pop_back</code>; check the character range before indexing.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::regex</code> over a list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It tests every word, O(N·L) per query, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::regex</code> construction is not cheap. The trie only explores branches that exist.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you rank by popularity?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store a count per word; keep the best k in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::priority_queue</code> used as a min-heap of size k, or cache top-k per node at insert time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">search</code> <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">const</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It does not change the trie, so it can run on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const WordDictionary&amp;</code>. The counting version in example 2 is not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">const</code> because it updates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">visited</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">*</code> matches zero or more letters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*</code>, recurse twice: skip it, or consume one child letter and stay on the star. Memoise on node pointer and index.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you free the trie?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing to do: each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unique_ptr</code> deletes its child. Destruction is recursive, so only an extremely deep trie could exhaust the stack.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Wildcard** | A pattern character (here \`.\`) that matches any one character |
| **Depth-first search (DFS)** | Explore one branch fully before the next |
| **Short-circuit** | Stop as soon as the answer is known |
| **Branching factor** | The number of children a node can have; a dot fans out to all of them |
| **Preorder traversal** | Visit a node before its children; on a sorted trie it lists words alphabetically |
| **Top-k suggestions** | Return only the first k results |

---
**Conclusion:** Autocomplete and wildcard search are the same trie read two ways. \`addWord\` is a normal O(L) insert into \`unique_ptr\` children; \`search\` is a recursive \`const\` walk that follows one child per letter and tries all 26 slots at a \`.\`, returning on the first match; \`suggest\` validates the characters, walks the prefix and lists the subtree in array order with one shared \`std::string&\`. The cost is O(L) for plain words and grows with the number of dots — our all-dot miss visited 6,804 nodes — so say that out loud and mention length buckets for dot-heavy workloads.`,
        examples: [
          {
            label: `addWord and search with '.' wildcards`,
            code: `#include <iostream>
#include <memory>
#include <string>

struct Node {
    std::unique_ptr<Node> children[26];
    bool isEnd = false;
};

class WordDictionary {
public:
    void addWord(const std::string& word) {
        Node* node = &root;
        for (char ch : word) {
            auto& child = node->children[ch - 'a'];
            if (!child) child = std::make_unique<Node>();
            node = child.get();
        }
        node->isEnd = true;
    }

    // '.' matches any one letter. DFS: branch only at a dot.
    bool search(const std::string& pattern) const { return dfs(&root, pattern, 0); }

private:
    Node root;

    static bool dfs(const Node* node, const std::string& p, size_t i) {
        if (i == p.size()) return node->isEnd;
        if (p[i] == '.') {
            for (const auto& child : node->children) {
                if (child && dfs(child.get(), p, i + 1)) return true; // first match wins
            }
            return false;
        }
        const Node* child = node->children[p[i] - 'a'].get();
        return child != nullptr && dfs(child, p, i + 1);
    }
};

int main() {
    WordDictionary d;
    for (const char* w : {"bad", "dad", "mad", "a"}) d.addWord(w);

    std::cout << std::boolalpha;
    std::cout << d.search("pad") << "\\n";   // false
    std::cout << d.search("bad") << "\\n";   // true
    std::cout << d.search(".ad") << "\\n";   // true
    std::cout << d.search("b..") << "\\n";   // true
    std::cout << d.search("...") << "\\n";   // true
    std::cout << d.search("....") << "\\n";  // false
    std::cout << d.search(".") << "\\n";     // true
    std::cout << d.search("b.") << "\\n";    // false
    std::cout << d.search("..d") << "\\n";   // true
    std::cout << d.search("") << "\\n";      // false
}`,
          },
          {
            label: `Autocomplete per keystroke, wildcard prefixes, cost of dots`,
            code: `#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct Node {
    std::unique_ptr<Node> children[26]; // index order = alphabetical order
    bool isEnd = false;
};

class Autocomplete {
public:
    int visited = 0;

    explicit Autocomplete(const std::vector<std::string>& words) {
        for (const auto& w : words) {
            Node* node = &root;
            for (char ch : w) {
                auto& child = node->children[ch - 'a'];
                if (!child) child = std::make_unique<Node>();
                node = child.get();
            }
            node->isEnd = true;
        }
    }

    std::vector<std::string> suggest(const std::string& prefix, size_t k) const {
        std::vector<std::string> out;
        const Node* node = &root;
        for (char ch : prefix) {
            if (ch < 'a' || ch > 'z' || !(node = node->children[ch - 'a'].get())) return out;
        }
        std::string path = prefix;
        collect(node, path, out, k);
        return out;
    }

    // Autocomplete where the typed prefix may contain '.' wildcards.
    std::vector<std::string> suggestPattern(const std::string& p, size_t k) const {
        std::vector<std::string> out;
        std::string path;
        walk(&root, p, 0, path, out, k);
        return out;
    }

    // Exact match with '.'; counts every node the DFS enters.
    bool search(const std::string& p) {
        visited = 0;
        return dfs(&root, p, 0);
    }

private:
    Node root;

    // Preorder DFS in alphabetical order: words come out sorted.
    static void collect(const Node* node, std::string& path, std::vector<std::string>& out, size_t k) {
        if (out.size() == k) return;
        if (node->isEnd) out.push_back(path);
        for (int c = 0; c < 26; c++) {
            if (!node->children[c]) continue;
            path.push_back(static_cast<char>('a' + c));
            collect(node->children[c].get(), path, out, k);
            path.pop_back();
        }
    }

    static void walk(const Node* node, const std::string& p, size_t i, std::string& path,
                     std::vector<std::string>& out, size_t k) {
        if (out.size() == k) return;
        if (i == p.size()) {
            collect(node, path, out, k);
            return;
        }
        int lo = p[i] == '.' ? 0 : p[i] - 'a';
        int hi = p[i] == '.' ? 25 : p[i] - 'a';
        for (int c = lo; c <= hi; c++) {
            if (!node->children[c]) continue;
            path.push_back(static_cast<char>('a' + c));
            walk(node->children[c].get(), p, i + 1, path, out, k);
            path.pop_back();
        }
    }

    bool dfs(const Node* node, const std::string& p, size_t i) {
        visited++;
        if (i == p.size()) return node->isEnd;
        if (p[i] == '.') {
            for (const auto& child : node->children) {
                if (child && dfs(child.get(), p, i + 1)) return true;
            }
            return false;
        }
        const Node* child = node->children[p[i] - 'a'].get();
        return child != nullptr && dfs(child, p, i + 1);
    }
};

std::string fmt(const std::vector<std::string>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + xs[i];
    return s + "]";
}

std::string pad(const std::string& s, size_t w) { return s + std::string(s.size() < w ? w - s.size() : 0, ' '); }

long long seed = 7;
int nxt() {
    seed = seed * 48271 % 2147483647LL;
    return static_cast<int>(seed);
}

int main() {
    Autocomplete ac({"mobile", "mouse", "moneypot", "monitor", "mousepad"});
    std::string typed;
    for (char ch : std::string("mouse")) {
        typed += ch;
        std::cout << pad(typed, 6) << fmt(ac.suggest(typed, 3)) << "\\n";
    }
    std::cout << "mo.i  " << fmt(ac.suggestPattern("mo.i", 10)) << "\\n";
    std::cout << "..u   " << fmt(ac.suggestPattern("..u", 10)) << "\\n";
    std::cout << "x     " << fmt(ac.suggest("x", 3)) << "\\n";

    std::vector<std::string> words;
    for (int i = 0; i < 5000; i++) {
        int n = 3 + nxt() % 6;
        std::string w;
        for (int j = 0; j < n; j++) w += static_cast<char>('a' + nxt() % 5);
        words.push_back(w);
    }
    Autocomplete big(words);
    for (const char* p : {"abcd", "abcdx", "a..d", "........", ".......x"}) {
        bool found = big.search(p);
        std::cout << "search " << pad(p, 9) << pad(found ? "true" : "false", 6) << "nodes visited " << big.visited << "\\n";
    }
}`,
          },
        ],
      },
    },
  },
  {
    title: `What is a segment tree and when do you need one?`,
    difficulty: "hard",
    seoDescription: `Segment trees explained: range queries with updates in O(log n), the three overlap cases, lazy propagation, and when prefix sums or Fenwick trees win.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"What is a segment tree? Explain how it answers a range-sum query and a point update, how big the array needs to be, and how you would support adding a value to a whole range. When would you choose it over prefix sums or a Fenwick tree? Show the core in Python."

**What a strong answer should cover:**
- Each node stores an aggregate of one index range; children split the range in half; about log₂ n levels; any associative merge (sum, min, max, gcd) works.
- Query with the no / total / partial overlap cases and update along one root-to-leaf path, both O(log n); build is O(n).
- The implicit array layout (children 2i and 2i + 1) and why 4n slots are enough.
- Lazy propagation for range updates: tag fully covered nodes and push tags down before visiting children.
- When to use it versus prefix sums (static array), a Fenwick tree (sums with point updates) and a sparse table (static min/max).
- Python details: a list of size \`4 * n\`, \`hi=None\` instead of a default that uses \`self\`, \`float('inf')\` as the min identity, and the recursion depth being only about log₂ n.

**Code / implementation expected:** Optional — a recursive sum segment tree with \`update\` and \`query\` in Python; lazy propagation is usually discussed rather than fully coded.`,
        answer: `**Target Audience:** Developers comfortable with recursion and binary trees who want the main range-query structure.  
**Difficulty:** Hard  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A school has 1,000 classrooms in a row, and the head teacher keeps asking the same kind of question: *"How many students are in rooms 120 to 480 right now?"* Students move between rooms all day, so the numbers keep changing.

Counting room by room answers each question correctly but takes up to 1,000 steps. Writing down a running total once ("rooms 1 to k hold this many") makes each question instant — until one student moves, and then half of the running totals are wrong and must be rewritten.

The school's real fix is a chain of helpers. Every pair of neighbouring rooms has a helper who knows their combined total; every pair of those helpers has a supervisor who knows the total of four rooms; and so on up to one head helper who knows the whole school. When a student moves, only the helpers *above that room* update their number — about 10 of them for 1,000 rooms. When the head teacher asks about rooms 120 to 480, a handful of helpers whose blocks fit inside that range each shout their total, and the answer is their sum.

That chain of helpers is a **segment tree**. It is the tool for one specific situation: an array that **keeps changing** and **range questions** — sum, minimum, maximum — that keep coming.

## 2. The Problem It Solves

You have an array of n numbers and a stream of two kinds of operations, mixed together:

- **update(i, value)** — change one element;
- **query(l, r)** — the sum (or min, or max…) of the elements from index l to r.

📌 **Interview term: Range query** — a question about a contiguous slice \`a[l..r]\` of an array, such as its sum, minimum or maximum.

📌 **Interview term: Point update** — changing a single element \`a[i]\`.

The two simple approaches each fail one side:

| Approach | update | query | Problem |
| :--- | :--- | :--- | :--- |
| Plain array, add up the slice | O(1) | O(n) | Queries are slow |
| Prefix sums (see the [prefix sum technique](/interview-question/what-is-the-prefix-sum-technique)) | O(n) | O(1) | Every update rewrites up to n totals |
| **Segment tree** | **O(log n)** | **O(log n)** | Both fast |

With 100,000 elements and 100,000 operations, the plain array can need around 10^10 steps in the worst case; the segment tree needs roughly 100,000 × 2 × 17 ≈ 3.4 million, because log₂(100,000) ≈ 17. (If the notation is new, see [Big-O](/interview-question/what-is-big-o-notation).)

## 3. What a Segment Tree Is

A segment tree is a binary tree built over the array. Every node is responsible for a **segment** (a range of indexes) and stores the answer for that segment — here, its sum. The root covers the whole array. Each node splits its range in half and gives one half to each child. The leaves cover single elements.

📌 **Interview term: Segment tree** — a binary tree where each node stores an aggregate (sum, min, max, gcd…) of one contiguous range of the array, the root covering everything and each leaf one element.

Here it is for the array \`[2, 1, 5, 3, 4]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 358" role="img" aria-label="Segment tree for the array 2 1 5 3 4. Each node stores the sum of its index range. The root covers 0 to 4 with sum 15 and the leaves hold single values">
  <path class="d-edge" d="M 381 68 L 217 110"/>
  <path class="d-edge" d="M 381 68 L 545 110"/>
  <path class="d-edge" d="M 217 158 L 135 200"/>
  <path class="d-edge" d="M 217 158 L 300 200"/>
  <path class="d-edge" d="M 545 158 L 470 200"/>
  <path class="d-edge" d="M 545 158 L 620 200"/>
  <path class="d-edge" d="M 135 248 L 70 290"/>
  <path class="d-edge" d="M 135 248 L 200 290"/>
  <rect class="d-box" x="331" y="20" width="100" height="48" rx="8"/>
  <text class="d-sub" x="381" y="39" text-anchor="middle">0..4</text>
  <text class="d-text" x="381" y="59" text-anchor="middle">sum 15</text>
  <rect class="d-box" x="167" y="110" width="100" height="48" rx="8"/>
  <text class="d-sub" x="217" y="129" text-anchor="middle">0..2</text>
  <text class="d-text" x="217" y="149" text-anchor="middle">sum 8</text>
  <rect class="d-box" x="495" y="110" width="100" height="48" rx="8"/>
  <text class="d-sub" x="545" y="129" text-anchor="middle">3..4</text>
  <text class="d-text" x="545" y="149" text-anchor="middle">sum 7</text>
  <rect class="d-box" x="95" y="200" width="80" height="48" rx="8"/>
  <text class="d-sub" x="135" y="219" text-anchor="middle">0..1</text>
  <text class="d-text" x="135" y="239" text-anchor="middle">sum 3</text>
  <rect class="d-box-muted" x="260" y="200" width="80" height="48" rx="8"/>
  <text class="d-sub" x="300" y="219" text-anchor="middle">2..2</text>
  <text class="d-text" x="300" y="239" text-anchor="middle">sum 5</text>
  <rect class="d-box-muted" x="430" y="200" width="80" height="48" rx="8"/>
  <text class="d-sub" x="470" y="219" text-anchor="middle">3..3</text>
  <text class="d-text" x="470" y="239" text-anchor="middle">sum 3</text>
  <rect class="d-box-muted" x="580" y="200" width="80" height="48" rx="8"/>
  <text class="d-sub" x="620" y="219" text-anchor="middle">4..4</text>
  <text class="d-text" x="620" y="239" text-anchor="middle">sum 4</text>
  <rect class="d-box-muted" x="30" y="290" width="80" height="48" rx="8"/>
  <text class="d-sub" x="70" y="309" text-anchor="middle">0..0</text>
  <text class="d-text" x="70" y="329" text-anchor="middle">sum 2</text>
  <rect class="d-box-muted" x="160" y="290" width="80" height="48" rx="8"/>
  <text class="d-sub" x="200" y="309" text-anchor="middle">1..1</text>
  <text class="d-text" x="200" y="329" text-anchor="middle">sum 1</text>
</svg>

The root covers indexes 0..4 and stores 15. Its children cover 0..2 (sum 8) and 3..4 (sum 7), and so on down to single elements. Every internal node's value is the sum of its two children's values. Because the range halves at every level, the tree has about log₂ n levels.

📌 **Interview term: Associative merge** — the operation used to combine two children, such as \`+\`, \`min\`, \`max\` or \`gcd\`. It must be associative (\`(a ∘ b) ∘ c = a ∘ (b ∘ c)\`) so that combining halves gives the same answer as combining elements one by one. A segment tree works for any such operation, which is its big advantage over a Fenwick tree.

📌 **Interview term: Implicit (array-based) tree** — storing a tree in a plain array without pointers: node 1 is the root, and node i has children 2i and 2i + 1. A size of 4n is always enough: the tree has at most 2·P nodes, where P is the smallest power of two that is ≥ n, and P < 2n. We checked it: for n = 6 the recursive split already uses node index 13 (so \`2 * n\` slots are not enough), and for every n below 5,000 the largest node index stayed under 3.91·n.

## 4. Answering a Query: Three Cases

\`query(l, r)\` starts at the root and, at each node covering \`lo..hi\`, looks at how that range relates to \`l..r\`:

1. **No overlap** (\`r < lo\` or \`hi < l\`) — this node contributes nothing; return 0 (for a sum).
2. **Total overlap** (\`l ≤ lo\` and \`hi ≤ r\`) — the whole segment is wanted; return the stored value without going deeper.
3. **Partial overlap** — ask both children and add their answers.

📌 **Interview term: Overlap cases** — the no / total / partial classification of a node range against the query range; it is the whole query algorithm.

Here is \`query(1, 3)\` on the same tree:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 408" role="img" aria-label="Query for the sum of indexes 1 to 3. Nodes 1..1, 2..2 and 3..3 are fully inside and give 1, 5 and 3. Nodes 0..0 and 4..4 are outside. The rest are split">
  <rect class="d-box-accent" x="20" y="16" width="26" height="20" rx="4"/>
  <text class="d-sub" x="56" y="31">total overlap: use the stored sum</text>
  <rect class="d-box" x="330" y="16" width="26" height="20" rx="4"/>
  <text class="d-sub" x="366" y="31">partial: ask both children</text>
  <rect class="d-box-muted" x="580" y="16" width="26" height="20" rx="4"/>
  <text class="d-sub" x="616" y="31">no overlap</text>
  <path class="d-edge" d="M 381 118 L 217 160"/>
  <path class="d-edge" d="M 381 118 L 545 160"/>
  <path class="d-edge" d="M 217 208 L 135 250"/>
  <path class="d-edge" d="M 217 208 L 300 250"/>
  <path class="d-edge" d="M 545 208 L 470 250"/>
  <path class="d-edge" d="M 545 208 L 620 250"/>
  <path class="d-edge" d="M 135 298 L 70 340"/>
  <path class="d-edge" d="M 135 298 L 200 340"/>
  <rect class="d-box" x="331" y="70" width="100" height="48" rx="8"/>
  <text class="d-sub" x="381" y="89" text-anchor="middle">0..4</text>
  <text class="d-text" x="381" y="109" text-anchor="middle">split</text>
  <rect class="d-box" x="167" y="160" width="100" height="48" rx="8"/>
  <text class="d-sub" x="217" y="179" text-anchor="middle">0..2</text>
  <text class="d-text" x="217" y="199" text-anchor="middle">split</text>
  <rect class="d-box" x="495" y="160" width="100" height="48" rx="8"/>
  <text class="d-sub" x="545" y="179" text-anchor="middle">3..4</text>
  <text class="d-text" x="545" y="199" text-anchor="middle">split</text>
  <rect class="d-box" x="95" y="250" width="80" height="48" rx="8"/>
  <text class="d-sub" x="135" y="269" text-anchor="middle">0..1</text>
  <text class="d-text" x="135" y="289" text-anchor="middle">split</text>
  <rect class="d-box-accent" x="260" y="250" width="80" height="48" rx="8"/>
  <text class="d-sub" x="300" y="269" text-anchor="middle">2..2</text>
  <text class="d-text" x="300" y="289" text-anchor="middle">use 5</text>
  <rect class="d-box-accent" x="430" y="250" width="80" height="48" rx="8"/>
  <text class="d-sub" x="470" y="269" text-anchor="middle">3..3</text>
  <text class="d-text" x="470" y="289" text-anchor="middle">use 3</text>
  <rect class="d-box-muted" x="580" y="250" width="80" height="48" rx="8"/>
  <text class="d-sub" x="620" y="269" text-anchor="middle">4..4</text>
  <text class="d-text" x="620" y="289" text-anchor="middle">skip</text>
  <rect class="d-box-muted" x="30" y="340" width="80" height="48" rx="8"/>
  <text class="d-sub" x="70" y="359" text-anchor="middle">0..0</text>
  <text class="d-text" x="70" y="379" text-anchor="middle">skip</text>
  <rect class="d-box-accent" x="160" y="340" width="80" height="48" rx="8"/>
  <text class="d-sub" x="200" y="359" text-anchor="middle">1..1</text>
  <text class="d-text" x="200" y="379" text-anchor="middle">use 1</text>
</svg>

The answer is 1 + 5 + 3 = 9, assembled from three nodes that fit inside 1..3. Nodes 0..0 and 4..4 are outside and are dropped at once; everything else is split.

**Why it is O(log n):** at every level at most two nodes can be *partially* covered (the ones containing the left and right edges of the query), so at most four nodes per level are visited. We checked this by brute force: for a 1,000-element tree, over all 500,500 possible ranges, no level ever had more than 4 visited nodes and no query visited more than 39 nodes in total.

## 5. Point Update: Fix One Path

\`update(i, value)\` walks from the root down to the leaf for index i — choosing the left child if \`i ≤ mid\`, otherwise the right — sets the leaf, and on the way back up recomputes each parent from its two children. Only the about log₂ n nodes on that one path change. Setting \`a[2] = 10\` in the example changes the sums on the path 0..4 → 0..2 → 2..2, and \`query(1, 3)\` becomes 1 + 10 + 3 = 14.

## 6. Range Updates and Lazy Propagation

Sometimes the update is also a range: "add 4 to every element from 1 to 4". Doing that as many point updates costs O(n log n) per operation. **Lazy propagation** makes it O(log n) too.

The idea: when an update fully covers a node's segment, update that node's stored answer (for a min tree, adding 4 to every element adds 4 to the minimum) and **leave a note** — a *lazy tag* — saying "my children still owe +4". Do not go further down. Later, whenever any operation needs to pass through that node to its children, it first **pushes** the tag down one level.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Lazy propagation. Adding 4 to indexes 0 to 2 updates node 0..2 and stores a lazy tag of 4 there. Its children are not touched until a later query passes through">
  <rect class="d-box" x="290" y="20" width="120" height="56" rx="8"/>
  <text class="d-sub" x="350" y="42" text-anchor="middle">0..5</text>
  <text class="d-text" x="350" y="64" text-anchor="middle">partial</text>
  <path class="d-edge" d="M 330 78 L 210 128"/>
  <path class="d-edge" d="M 370 78 L 490 128"/>
  <rect class="d-box-accent" x="120" y="130" width="180" height="62" rx="8"/>
  <text class="d-sub" x="210" y="152" text-anchor="middle">0..2 fully covered</text>
  <text class="d-text" x="210" y="178" text-anchor="middle">min += 4, lazy = 4</text>
  <rect class="d-box-muted" x="420" y="130" width="140" height="62" rx="8"/>
  <text class="d-sub" x="490" y="152" text-anchor="middle">3..5</text>
  <text class="d-text" x="490" y="178" text-anchor="middle">outside, skip</text>
  <path class="d-edge-dashed" d="M 170 194 L 100 238"/>
  <path class="d-edge-dashed" d="M 250 194 L 320 238"/>
  <rect class="d-box-muted" x="30" y="240" width="140" height="48" rx="8"/>
  <text class="d-sub" x="100" y="270" text-anchor="middle">0..1 not touched</text>
  <rect class="d-box-muted" x="250" y="240" width="140" height="48" rx="8"/>
  <text class="d-sub" x="320" y="270" text-anchor="middle">2..2 not touched</text>
</svg>

Node 0..2 is fully covered by the update, so it absorbs the change and stores a lazy tag of 4. Its children are not visited at all; they will receive the +4 only if a later query or update needs to look inside 0..2.

📌 **Interview term: Lazy propagation** — postponing a range update at the highest fully covered nodes and pushing it to the children only when they are next visited, so that range updates cost O(log n).

📌 **Interview term: Push-down** — the step that moves a node's pending lazy tag to its two children (updating their values and their own tags) before the children are used.

Example 2 below builds a range-add / range-min tree this way and checks it against brute force on 2,000 random operations.

## 7. When Do You Need One?

A segment tree is more code than the alternatives, so reach for it only when they do not fit:

| Situation | Best tool | Why |
| :--- | :--- | :--- |
| Array never changes, range sums | [Prefix sums](/interview-question/what-is-the-prefix-sum-technique) | O(1) query after O(n) setup; trivial code |
| Point updates + range **sums** (or counts) | Fenwick tree (binary indexed tree) | Same O(log n), much shorter code — see [Count of smaller numbers after self with a Fenwick tree](/interview-question/count-of-smaller-numbers-after-self-with-fenwick-tree-how-to-coordinate-compress) |
| Point updates + range **min / max / gcd** | Segment tree | Min and max cannot be "subtracted", so the Fenwick prefix trick does not apply |
| Range updates + range queries | Segment tree with lazy propagation | The only one of these that handles both in O(log n) |
| Array never changes, range min / max | Sparse table | O(1) query after O(n log n) setup, no updates |
| Values inserted and deleted, order statistics | Balanced [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) with subtree sizes | Keyed by value, not by position |

Typical interview signals for a segment tree: "range minimum with updates", "count of elements in a range that changes", "add to a range then ask for the maximum", or a problem that needs a custom merge (for example the maximum subarray sum inside a range, where each node stores four numbers).

## 8. The Code in Python

The Python version keeps the tree in a list of size \`4 * n\`. The recursive methods take \`node, lo, hi\` as default arguments so callers only write \`st.query(1, 3)\`; \`hi=None\` is replaced by \`self.n - 1\`, because a default value cannot refer to \`self\`. Python integers never overflow, so the sums are always exact.

~~~python
class SegmentTree:
    """Range sum + point update. Node 1 is the root; node i has children 2i and 2i+1."""

    def __init__(self, values):
        self.n = len(values)
        self.tree = [0] * (4 * self.n)  # 4n is always enough room
        self.visited = 0
        if self.n:
            self._build(values, 1, 0, self.n - 1)

    def _build(self, a, node, lo, hi):
        if lo == hi:
            self.tree[node] = a[lo]
            return
        mid = (lo + hi) // 2
        self._build(a, 2 * node, lo, mid)
        self._build(a, 2 * node + 1, mid + 1, hi)
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]

    def update(self, i, value, node=1, lo=0, hi=None):
        if hi is None:
            hi = self.n - 1
        self.visited += 1
        if lo == hi:
            self.tree[node] = value
            return
        mid = (lo + hi) // 2
        if i <= mid:
            self.update(i, value, 2 * node, lo, mid)
        else:
            self.update(i, value, 2 * node + 1, mid + 1, hi)
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]

    def query(self, l, r, node=1, lo=0, hi=None):
        """Sum of values[l..r], both ends included."""
        if hi is None:
            hi = self.n - 1
        self.visited += 1
        if r < lo or hi < l:          # no overlap
            return 0
        if l <= lo and hi <= r:       # total overlap: use the stored sum
            return self.tree[node]
        mid = (lo + hi) // 2          # partial overlap: ask both children
        return self.query(l, r, 2 * node, lo, mid) + self.query(l, r, 2 * node + 1, mid + 1, hi)
~~~

**What to point out in this code:**

- The three \`if\` lines in \`query\` *are* the algorithm: no overlap returns 0, total overlap returns the stored sum, partial overlap recurses.
- \`update\` recurses into exactly one child, then recomputes \`self.tree[node]\` on the way back up.
- Recursion depth is only about log₂ n (around 17 for 100,000 elements), far below Python's default recursion limit of 1000.
- For speed in Python, an iterative bottom-up tree (leaves at \`n..2n-1\`) avoids function-call overhead; the recursive version is clearer for an interview.

### Lazy propagation in Python

The lazy version adds a second list, \`lazy\`, and one helper, \`_push\`. The rule to remember: **any time you are about to recurse into a node's children, push its tag first**; and after recursing in \`add\`, recompute the node from its children. Note that the method is called \`query_min\`, not \`min\`: inside it we still call Python's built-in \`min\`, and naming a method \`min\` invites confusion.

~~~python
def _push(self, node):
    if self.lazy[node]:
        for child in (2 * node, 2 * node + 1):
            self.mn[child] += self.lazy[node]
            self.lazy[child] += self.lazy[node]
        self.lazy[node] = 0

def add(self, l, r, delta, node=1, lo=0, hi=None):
    if hi is None:
        hi = self.n - 1
    self.visited += 1
    if r < lo or hi < l:
        return
    if l <= lo and hi <= r:          # whole segment: tag it and stop here
        self.mn[node] += delta
        self.lazy[node] += delta
        return
    self._push(node)
    mid = (lo + hi) // 2
    self.add(l, r, delta, 2 * node, lo, mid)
    self.add(l, r, delta, 2 * node + 1, mid + 1, hi)
    self.mn[node] = min(self.mn[2 * node], self.mn[2 * node + 1])

def query_min(self, l, r, node=1, lo=0, hi=None):
    if hi is None:
        hi = self.n - 1
    self.visited += 1
    if r < lo or hi < l:
        return float("inf")
    if l <= lo and hi <= r:
        return self.mn[node]
    self._push(node)
    mid = (lo + hi) // 2
    return min(self.query_min(l, r, 2 * node, lo, mid),
               self.query_min(l, r, 2 * node + 1, mid + 1, hi))
~~~

## 9. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. The random operations come from a small deterministic generator (MINSTD), so every language performs the identical sequence.

**Example 1 — the sum tree for \`[2, 1, 5, 3, 4]\`, then 3,000 random updates and queries against brute force** prints:

~~~text
level 0: [15]
level 1: [8, 7]
level 2: [3, 5, 3, 4]
level 3: [2, 1]
sum(1, 3) = 9
after a[2] = 10, sum(1, 3) = 14
sum(0, 4) = 20, sum(4, 4) = 4
n = 2000, 3000 random operations
brute force:  checksum 524696361, array cells read 1052316
segment tree: checksum 524696361, tree nodes visited 74213
~~~

The four "level" lines are the tree from section 3 read row by row. In the random test both methods produce the same checksum (the sum of all query answers), but brute force read **1,052,316** array cells while the segment tree visited **74,213** nodes for all updates and queries together — about 25 nodes per operation for n = 2,000.

**Example 2 — range add + range min with lazy propagation, checked against brute force** prints:

~~~text
min(0, 3) = 3
add 4 to [1, 4] -> min(0, 3) = 5, min(2, 5) = 4
add -10 to [0, 0] -> min(0, 5) = -5
n = 1000, 2000 random operations
queries matched brute force: 1002 / 1002
brute force cells touched by range adds: 326802
lazy tree nodes visited (adds and queries): 65910
~~~

After adding 4 to indexes 1..4 the array is \`[5, 7, 12, 10, 5, 4]\`, so \`min(0, 3)\` is 5 and \`min(2, 5)\` is 4; after adding −10 to index 0, the overall minimum is −5. On 2,000 random operations every one of the 1,002 queries matched brute force, and the range adds that cost brute force 326,802 cell writes were handled by the lazy tree in 65,910 node visits including all the queries.

## 10. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| Build | O(n) | each of the about 2n nodes is computed once from its children |
| Point update | O(log n) | one root-to-leaf path |
| Range query | O(log n) | at most 4 nodes per level (checked: at most 39 nodes for n = 1,000) |
| Range update with lazy propagation | O(log n) | same visiting pattern as a query, plus O(1) push-downs |

| Space | Bound | Why |
| :--- | :--- | :--- |
| Tree array | 4n slots | safe upper bound for the implicit layout (about 2n are actually used) |
| Lazy array | 4n slots | one pending tag per node |
| Recursion | O(log n) | the depth of the tree |

In Python each node visit is a method call, so the constant factor is large; it is still the right asymptotic tool, and the bottom-up iterative form is faster in practice.

## 11. Edge Cases

- **Empty array** — guard the build (\`n == 0\`), or every query would recurse on the range 0..−1.
- **Single element** — the root is a leaf; queries and updates still work.
- **\`l > r\`** — decide whether that is an error or an empty range; example code swaps them before calling.
- **\`l == r\`** — a single-element query; it walks to one leaf (\`sum(4, 4) = 4\` in example 1).
- **Identity values** — the no-overlap result must be the identity of the merge: 0 for sum, +∞ for min, −∞ for max, 0 for gcd.
- **Negative numbers** — fine for sum and min (example 2 goes down to −5); they only matter if you assumed "0 means empty".

## Common Pitfalls

- **Default argument \`hi=self.n - 1\`.** Defaults are evaluated once, when the method is defined, and \`self\` does not exist then; use \`hi=None\` and fill it in.
- **Allocating \`2 * n\` for the recursive layout.** The recursive midpoint split can need up to about 4n slots when n is not a power of two; \`2 * n\` works only for the iterative bottom-up layout.
- **Returning the wrong identity.** \`return 0\` for a no-overlap *min* query silently returns 0 for any range of positive numbers. Use \`float("inf")\`.
- **Forgetting the push-down** before recursing in a lazy tree — children then answer with stale values.
- **Naming a method \`min\` or \`sum\`.** It works inside a class, but it is easy to shadow the built-in by accident elsewhere; \`query_min\` is clearer.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">A binary tree over the array where each node stores the sum, min or max of one index range; the root covers everything, the leaves one element.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The query:</strong> <span style="color:#f0e2c8;">Three cases at each node: no overlap returns the identity, total overlap returns the stored value, partial overlap asks both children. O(log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The update:</strong> <span style="color:#f0e2c8;">Walk the one root-to-leaf path and recompute the parents: O(log n). Range updates use lazy tags pushed down only when needed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When to use it:</strong> <span style="color:#f0e2c8;">A changing array plus range queries. Prefix sums if it never changes, a Fenwick tree for sums with point updates, a segment tree for min/max/custom merges or range updates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;">A list of size <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">4 * n</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hi=None</code> defaults because a default cannot use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float("inf")</code> as the min identity; no overflow worries.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not prefix sums?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prefix sums answer in O(1) but one point update shifts up to n of them. With a mix of updates and queries the segment tree's O(log n) for both wins.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Segment tree or Fenwick tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For sums with point updates a Fenwick tree is shorter and lighter. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gcd</code> or range updates, use a segment tree: a Fenwick tree relies on subtracting prefixes, and you cannot subtract a minimum.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the array size <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">4 * n</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The recursive layout needs at most twice the smallest power of two that is at least n, and that power is below 2n. With n = 6 the recursive layout already uses node index 13, past the 12 slots of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 * n</code>; for every n below 5000 the largest index stayed under 3.91 times n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does lazy propagation stay correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A fully covered node gets its value updated plus a tag; before any operation goes into its children, the tag is pushed down. So a node value is always correct, and children are fixed exactly when they are next read.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is a query O(log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At most two nodes per level are partially covered, so at most four per level are visited. We checked every range of a 1000-element tree: never more than 4 per level, 39 in total.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Range query** | A question about a slice a[l..r]: its sum, min, max… |
| **Point update** | Changing a single element a[i] |
| **Segment tree** | A binary tree whose nodes store an aggregate of one index range each |
| **Associative merge** | The combine operation (+, min, max, gcd); grouping must not change the result |
| **Implicit (array-based) tree** | A tree stored in an array: node i has children 2i and 2i + 1 |
| **Overlap cases** | No, total or partial overlap between a node range and the query range |
| **Lazy propagation** | Store a range update as a tag on covering nodes; push it down only when needed |
| **Push-down** | Moving a pending tag from a node to its two children before using them |

---
**Conclusion:** A segment tree stores the sum (or min, max, gcd) of every halving range of an array, so any range query is assembled from at most four nodes per level and any point update fixes one root-to-leaf path — both O(log n). In Python it is a list of size \`4 * n\` and three short recursive methods whose heart is the no / total / partial overlap test; lazy tags extend it to range updates. Use it when the array changes and the queries are ranges: prefer prefix sums for a static array and a Fenwick tree for plain sums, and say why.`,
        examples: [
          {
            label: `Sum segment tree: build, query, update, vs brute force`,
            code: `class SegmentTree:
    """Range sum + point update. Node 1 is the root; node i has children 2i and 2i+1."""

    def __init__(self, values):
        self.n = len(values)
        self.tree = [0] * (4 * self.n)  # 4n is always enough room
        self.visited = 0
        if self.n:
            self._build(values, 1, 0, self.n - 1)

    def _build(self, a, node, lo, hi):
        if lo == hi:
            self.tree[node] = a[lo]
            return
        mid = (lo + hi) // 2
        self._build(a, 2 * node, lo, mid)
        self._build(a, 2 * node + 1, mid + 1, hi)
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]

    def update(self, i, value, node=1, lo=0, hi=None):
        if hi is None:
            hi = self.n - 1
        self.visited += 1
        if lo == hi:
            self.tree[node] = value
            return
        mid = (lo + hi) // 2
        if i <= mid:
            self.update(i, value, 2 * node, lo, mid)
        else:
            self.update(i, value, 2 * node + 1, mid + 1, hi)
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]

    def query(self, l, r, node=1, lo=0, hi=None):
        """Sum of values[l..r], both ends included."""
        if hi is None:
            hi = self.n - 1
        self.visited += 1
        if r < lo or hi < l:          # no overlap
            return 0
        if l <= lo and hi <= r:       # total overlap: use the stored sum
            return self.tree[node]
        mid = (lo + hi) // 2          # partial overlap: ask both children
        return self.query(l, r, 2 * node, lo, mid) + self.query(l, r, 2 * node + 1, mid + 1, hi)

    def levels(self):
        out, row = [], [(1, 0, self.n - 1)]
        while row:
            out.append([self.tree[nd] for nd, _, _ in row])
            nxt_row = []
            for nd, lo, hi in row:
                if lo < hi:
                    mid = (lo + hi) // 2
                    nxt_row += [(2 * nd, lo, mid), (2 * nd + 1, mid + 1, hi)]
            row = nxt_row
        return out


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


st = SegmentTree([2, 1, 5, 3, 4])
for depth, row in enumerate(st.levels()):
    print("level " + str(depth) + ": " + fmt(row))
print("sum(1, 3) = " + str(st.query(1, 3)))
st.update(2, 10)
print("after a[2] = 10, sum(1, 3) = " + str(st.query(1, 3)))
print("sum(0, 4) = " + str(st.query(0, 4)) + ", sum(4, 4) = " + str(st.query(4, 4)))

seed = 12345
def nxt():
    global seed
    seed = seed * 48271 % 2147483647
    return seed

n = 2000
a = [nxt() % 1000 for _ in range(n)]
st = SegmentTree(a)
st.visited = 0
brute_sum = tree_sum = cells = 0
for _ in range(3000):
    if nxt() % 2 == 0:
        i, v = nxt() % n, nxt() % 1000
        a[i] = v
        st.update(i, v)
    else:
        l, r = nxt() % n, nxt() % n
        if l > r:
            l, r = r, l
        brute_sum += sum(a[l:r + 1])
        cells += r - l + 1
        tree_sum += st.query(l, r)
print("n = 2000, 3000 random operations")
print("brute force:  checksum " + str(brute_sum) + ", array cells read " + str(cells))
print("segment tree: checksum " + str(tree_sum) + ", tree nodes visited " + str(st.visited))`,
          },
          {
            label: `Lazy propagation: range add + range min, vs brute force`,
            code: `class LazyMinTree:
    """Range add + range min. lazy[node] = an add not yet pushed to the children."""

    def __init__(self, values):
        self.n = len(values)
        self.mn = [0] * (4 * self.n)
        self.lazy = [0] * (4 * self.n)
        self.visited = 0
        self._build(values, 1, 0, self.n - 1)

    def _build(self, a, node, lo, hi):
        if lo == hi:
            self.mn[node] = a[lo]
            return
        mid = (lo + hi) // 2
        self._build(a, 2 * node, lo, mid)
        self._build(a, 2 * node + 1, mid + 1, hi)
        self.mn[node] = min(self.mn[2 * node], self.mn[2 * node + 1])

    def _push(self, node):
        if self.lazy[node]:
            for child in (2 * node, 2 * node + 1):
                self.mn[child] += self.lazy[node]
                self.lazy[child] += self.lazy[node]
            self.lazy[node] = 0

    def add(self, l, r, delta, node=1, lo=0, hi=None):
        if hi is None:
            hi = self.n - 1
        self.visited += 1
        if r < lo or hi < l:
            return
        if l <= lo and hi <= r:          # whole segment: tag it and stop here
            self.mn[node] += delta
            self.lazy[node] += delta
            return
        self._push(node)
        mid = (lo + hi) // 2
        self.add(l, r, delta, 2 * node, lo, mid)
        self.add(l, r, delta, 2 * node + 1, mid + 1, hi)
        self.mn[node] = min(self.mn[2 * node], self.mn[2 * node + 1])

    def query_min(self, l, r, node=1, lo=0, hi=None):
        if hi is None:
            hi = self.n - 1
        self.visited += 1
        if r < lo or hi < l:
            return float("inf")
        if l <= lo and hi <= r:
            return self.mn[node]
        self._push(node)
        mid = (lo + hi) // 2
        return min(self.query_min(l, r, 2 * node, lo, mid),
                   self.query_min(l, r, 2 * node + 1, mid + 1, hi))


a = [5, 3, 8, 6, 1, 4]
t = LazyMinTree(a)
print("min(0, 3) = " + str(t.query_min(0, 3)))
t.add(1, 4, 4)
print("add 4 to [1, 4] -> min(0, 3) = " + str(t.query_min(0, 3)) + ", min(2, 5) = " + str(t.query_min(2, 5)))
t.add(0, 0, -10)
print("add -10 to [0, 0] -> min(0, 5) = " + str(t.query_min(0, 5)))

seed = 99
def nxt():
    global seed
    seed = seed * 48271 % 2147483647
    return seed

n = 1000
a = [nxt() % 1000 for _ in range(n)]
t = LazyMinTree(a)
t.visited = 0
written = 0
matched = 0
queries = 0
for _ in range(2000):
    l, r = nxt() % n, nxt() % n
    if l > r:
        l, r = r, l
    if nxt() % 2 == 0:
        delta = nxt() % 21 - 10        # -10 .. 10
        for k in range(l, r + 1):
            a[k] += delta
        written += r - l + 1
        t.add(l, r, delta)
    else:
        queries += 1
        if min(a[l:r + 1]) == t.query_min(l, r):
            matched += 1
print("n = 1000, 2000 random operations")
print("queries matched brute force: " + str(matched) + " / " + str(queries))
print("brute force cells touched by range adds: " + str(written))
print("lazy tree nodes visited (adds and queries): " + str(t.visited))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"What is a segment tree? Explain how it answers a range-sum query and a point update, how big the array needs to be, and how you would support adding a value to a whole range. When would you choose it over prefix sums or a Fenwick tree? Show the core in JavaScript."

**What a strong answer should cover:**
- Each node stores an aggregate of one index range; children split the range in half; about log₂ n levels; any associative merge (sum, min, max, gcd) works.
- Query with the no / total / partial overlap cases and update along one root-to-leaf path, both O(log n); build is O(n).
- The implicit array layout (children 2i and 2i + 1) and why 4n slots are enough.
- Lazy propagation for range updates: tag fully covered nodes and push tags down before visiting children.
- When to use it versus prefix sums (static array), a Fenwick tree (sums with point updates) and a sparse table (static min/max).
- JavaScript details: \`new Array(4 * n).fill(0)\` (holes give \`NaN\`), default parameters that use \`this.n\`, \`Infinity\` as the min identity, and exact sums only up to 2^53 − 1.

**Code / implementation expected:** Optional — a recursive sum segment tree with \`update\` and \`query\` in JavaScript; lazy propagation is usually discussed rather than fully coded.`,
        answer: `**Target Audience:** Developers comfortable with recursion and binary trees who want the main range-query structure.  
**Difficulty:** Hard  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A school has 1,000 classrooms in a row, and the head teacher keeps asking the same kind of question: *"How many students are in rooms 120 to 480 right now?"* Students move between rooms all day, so the numbers keep changing.

Counting room by room answers each question correctly but takes up to 1,000 steps. Writing down a running total once ("rooms 1 to k hold this many") makes each question instant — until one student moves, and then half of the running totals are wrong and must be rewritten.

The school's real fix is a chain of helpers. Every pair of neighbouring rooms has a helper who knows their combined total; every pair of those helpers has a supervisor who knows the total of four rooms; and so on up to one head helper who knows the whole school. When a student moves, only the helpers *above that room* update their number — about 10 of them for 1,000 rooms. When the head teacher asks about rooms 120 to 480, a handful of helpers whose blocks fit inside that range each shout their total, and the answer is their sum.

That chain of helpers is a **segment tree**. It is the tool for one specific situation: an array that **keeps changing** and **range questions** — sum, minimum, maximum — that keep coming.

## 2. The Problem It Solves

You have an array of n numbers and a stream of two kinds of operations, mixed together:

- **update(i, value)** — change one element;
- **query(l, r)** — the sum (or min, or max…) of the elements from index l to r.

📌 **Interview term: Range query** — a question about a contiguous slice \`a[l..r]\` of an array, such as its sum, minimum or maximum.

📌 **Interview term: Point update** — changing a single element \`a[i]\`.

The two simple approaches each fail one side:

| Approach | update | query | Problem |
| :--- | :--- | :--- | :--- |
| Plain array, add up the slice | O(1) | O(n) | Queries are slow |
| Prefix sums (see the [prefix sum technique](/interview-question/what-is-the-prefix-sum-technique)) | O(n) | O(1) | Every update rewrites up to n totals |
| **Segment tree** | **O(log n)** | **O(log n)** | Both fast |

With 100,000 elements and 100,000 operations, the plain array can need around 10^10 steps in the worst case; the segment tree needs roughly 100,000 × 2 × 17 ≈ 3.4 million, because log₂(100,000) ≈ 17. (If the notation is new, see [Big-O](/interview-question/what-is-big-o-notation).)

## 3. What a Segment Tree Is

A segment tree is a binary tree built over the array. Every node is responsible for a **segment** (a range of indexes) and stores the answer for that segment — here, its sum. The root covers the whole array. Each node splits its range in half and gives one half to each child. The leaves cover single elements.

📌 **Interview term: Segment tree** — a binary tree where each node stores an aggregate (sum, min, max, gcd…) of one contiguous range of the array, the root covering everything and each leaf one element.

Here it is for the array \`[2, 1, 5, 3, 4]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 358" role="img" aria-label="Segment tree for the array 2 1 5 3 4. Each node stores the sum of its index range. The root covers 0 to 4 with sum 15 and the leaves hold single values">
  <path class="d-edge" d="M 381 68 L 217 110"/>
  <path class="d-edge" d="M 381 68 L 545 110"/>
  <path class="d-edge" d="M 217 158 L 135 200"/>
  <path class="d-edge" d="M 217 158 L 300 200"/>
  <path class="d-edge" d="M 545 158 L 470 200"/>
  <path class="d-edge" d="M 545 158 L 620 200"/>
  <path class="d-edge" d="M 135 248 L 70 290"/>
  <path class="d-edge" d="M 135 248 L 200 290"/>
  <rect class="d-box" x="331" y="20" width="100" height="48" rx="8"/>
  <text class="d-sub" x="381" y="39" text-anchor="middle">0..4</text>
  <text class="d-text" x="381" y="59" text-anchor="middle">sum 15</text>
  <rect class="d-box" x="167" y="110" width="100" height="48" rx="8"/>
  <text class="d-sub" x="217" y="129" text-anchor="middle">0..2</text>
  <text class="d-text" x="217" y="149" text-anchor="middle">sum 8</text>
  <rect class="d-box" x="495" y="110" width="100" height="48" rx="8"/>
  <text class="d-sub" x="545" y="129" text-anchor="middle">3..4</text>
  <text class="d-text" x="545" y="149" text-anchor="middle">sum 7</text>
  <rect class="d-box" x="95" y="200" width="80" height="48" rx="8"/>
  <text class="d-sub" x="135" y="219" text-anchor="middle">0..1</text>
  <text class="d-text" x="135" y="239" text-anchor="middle">sum 3</text>
  <rect class="d-box-muted" x="260" y="200" width="80" height="48" rx="8"/>
  <text class="d-sub" x="300" y="219" text-anchor="middle">2..2</text>
  <text class="d-text" x="300" y="239" text-anchor="middle">sum 5</text>
  <rect class="d-box-muted" x="430" y="200" width="80" height="48" rx="8"/>
  <text class="d-sub" x="470" y="219" text-anchor="middle">3..3</text>
  <text class="d-text" x="470" y="239" text-anchor="middle">sum 3</text>
  <rect class="d-box-muted" x="580" y="200" width="80" height="48" rx="8"/>
  <text class="d-sub" x="620" y="219" text-anchor="middle">4..4</text>
  <text class="d-text" x="620" y="239" text-anchor="middle">sum 4</text>
  <rect class="d-box-muted" x="30" y="290" width="80" height="48" rx="8"/>
  <text class="d-sub" x="70" y="309" text-anchor="middle">0..0</text>
  <text class="d-text" x="70" y="329" text-anchor="middle">sum 2</text>
  <rect class="d-box-muted" x="160" y="290" width="80" height="48" rx="8"/>
  <text class="d-sub" x="200" y="309" text-anchor="middle">1..1</text>
  <text class="d-text" x="200" y="329" text-anchor="middle">sum 1</text>
</svg>

The root covers indexes 0..4 and stores 15. Its children cover 0..2 (sum 8) and 3..4 (sum 7), and so on down to single elements. Every internal node's value is the sum of its two children's values. Because the range halves at every level, the tree has about log₂ n levels.

📌 **Interview term: Associative merge** — the operation used to combine two children, such as \`+\`, \`min\`, \`max\` or \`gcd\`. It must be associative (\`(a ∘ b) ∘ c = a ∘ (b ∘ c)\`) so that combining halves gives the same answer as combining elements one by one. A segment tree works for any such operation, which is its big advantage over a Fenwick tree.

📌 **Interview term: Implicit (array-based) tree** — storing a tree in a plain array without pointers: node 1 is the root, and node i has children 2i and 2i + 1. A size of 4n is always enough: the tree has at most 2·P nodes, where P is the smallest power of two that is ≥ n, and P < 2n. We checked it: for n = 6 the recursive split already uses node index 13 (so \`2 * n\` slots are not enough), and for every n below 5,000 the largest node index stayed under 3.91·n.

## 4. Answering a Query: Three Cases

\`query(l, r)\` starts at the root and, at each node covering \`lo..hi\`, looks at how that range relates to \`l..r\`:

1. **No overlap** (\`r < lo\` or \`hi < l\`) — this node contributes nothing; return 0 (for a sum).
2. **Total overlap** (\`l ≤ lo\` and \`hi ≤ r\`) — the whole segment is wanted; return the stored value without going deeper.
3. **Partial overlap** — ask both children and add their answers.

📌 **Interview term: Overlap cases** — the no / total / partial classification of a node range against the query range; it is the whole query algorithm.

Here is \`query(1, 3)\` on the same tree:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 408" role="img" aria-label="Query for the sum of indexes 1 to 3. Nodes 1..1, 2..2 and 3..3 are fully inside and give 1, 5 and 3. Nodes 0..0 and 4..4 are outside. The rest are split">
  <rect class="d-box-accent" x="20" y="16" width="26" height="20" rx="4"/>
  <text class="d-sub" x="56" y="31">total overlap: use the stored sum</text>
  <rect class="d-box" x="330" y="16" width="26" height="20" rx="4"/>
  <text class="d-sub" x="366" y="31">partial: ask both children</text>
  <rect class="d-box-muted" x="580" y="16" width="26" height="20" rx="4"/>
  <text class="d-sub" x="616" y="31">no overlap</text>
  <path class="d-edge" d="M 381 118 L 217 160"/>
  <path class="d-edge" d="M 381 118 L 545 160"/>
  <path class="d-edge" d="M 217 208 L 135 250"/>
  <path class="d-edge" d="M 217 208 L 300 250"/>
  <path class="d-edge" d="M 545 208 L 470 250"/>
  <path class="d-edge" d="M 545 208 L 620 250"/>
  <path class="d-edge" d="M 135 298 L 70 340"/>
  <path class="d-edge" d="M 135 298 L 200 340"/>
  <rect class="d-box" x="331" y="70" width="100" height="48" rx="8"/>
  <text class="d-sub" x="381" y="89" text-anchor="middle">0..4</text>
  <text class="d-text" x="381" y="109" text-anchor="middle">split</text>
  <rect class="d-box" x="167" y="160" width="100" height="48" rx="8"/>
  <text class="d-sub" x="217" y="179" text-anchor="middle">0..2</text>
  <text class="d-text" x="217" y="199" text-anchor="middle">split</text>
  <rect class="d-box" x="495" y="160" width="100" height="48" rx="8"/>
  <text class="d-sub" x="545" y="179" text-anchor="middle">3..4</text>
  <text class="d-text" x="545" y="199" text-anchor="middle">split</text>
  <rect class="d-box" x="95" y="250" width="80" height="48" rx="8"/>
  <text class="d-sub" x="135" y="269" text-anchor="middle">0..1</text>
  <text class="d-text" x="135" y="289" text-anchor="middle">split</text>
  <rect class="d-box-accent" x="260" y="250" width="80" height="48" rx="8"/>
  <text class="d-sub" x="300" y="269" text-anchor="middle">2..2</text>
  <text class="d-text" x="300" y="289" text-anchor="middle">use 5</text>
  <rect class="d-box-accent" x="430" y="250" width="80" height="48" rx="8"/>
  <text class="d-sub" x="470" y="269" text-anchor="middle">3..3</text>
  <text class="d-text" x="470" y="289" text-anchor="middle">use 3</text>
  <rect class="d-box-muted" x="580" y="250" width="80" height="48" rx="8"/>
  <text class="d-sub" x="620" y="269" text-anchor="middle">4..4</text>
  <text class="d-text" x="620" y="289" text-anchor="middle">skip</text>
  <rect class="d-box-muted" x="30" y="340" width="80" height="48" rx="8"/>
  <text class="d-sub" x="70" y="359" text-anchor="middle">0..0</text>
  <text class="d-text" x="70" y="379" text-anchor="middle">skip</text>
  <rect class="d-box-accent" x="160" y="340" width="80" height="48" rx="8"/>
  <text class="d-sub" x="200" y="359" text-anchor="middle">1..1</text>
  <text class="d-text" x="200" y="379" text-anchor="middle">use 1</text>
</svg>

The answer is 1 + 5 + 3 = 9, assembled from three nodes that fit inside 1..3. Nodes 0..0 and 4..4 are outside and are dropped at once; everything else is split.

**Why it is O(log n):** at every level at most two nodes can be *partially* covered (the ones containing the left and right edges of the query), so at most four nodes per level are visited. We checked this by brute force: for a 1,000-element tree, over all 500,500 possible ranges, no level ever had more than 4 visited nodes and no query visited more than 39 nodes in total.

## 5. Point Update: Fix One Path

\`update(i, value)\` walks from the root down to the leaf for index i — choosing the left child if \`i ≤ mid\`, otherwise the right — sets the leaf, and on the way back up recomputes each parent from its two children. Only the about log₂ n nodes on that one path change. Setting \`a[2] = 10\` in the example changes the sums on the path 0..4 → 0..2 → 2..2, and \`query(1, 3)\` becomes 1 + 10 + 3 = 14.

## 6. Range Updates and Lazy Propagation

Sometimes the update is also a range: "add 4 to every element from 1 to 4". Doing that as many point updates costs O(n log n) per operation. **Lazy propagation** makes it O(log n) too.

The idea: when an update fully covers a node's segment, update that node's stored answer (for a min tree, adding 4 to every element adds 4 to the minimum) and **leave a note** — a *lazy tag* — saying "my children still owe +4". Do not go further down. Later, whenever any operation needs to pass through that node to its children, it first **pushes** the tag down one level.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Lazy propagation. Adding 4 to indexes 0 to 2 updates node 0..2 and stores a lazy tag of 4 there. Its children are not touched until a later query passes through">
  <rect class="d-box" x="290" y="20" width="120" height="56" rx="8"/>
  <text class="d-sub" x="350" y="42" text-anchor="middle">0..5</text>
  <text class="d-text" x="350" y="64" text-anchor="middle">partial</text>
  <path class="d-edge" d="M 330 78 L 210 128"/>
  <path class="d-edge" d="M 370 78 L 490 128"/>
  <rect class="d-box-accent" x="120" y="130" width="180" height="62" rx="8"/>
  <text class="d-sub" x="210" y="152" text-anchor="middle">0..2 fully covered</text>
  <text class="d-text" x="210" y="178" text-anchor="middle">min += 4, lazy = 4</text>
  <rect class="d-box-muted" x="420" y="130" width="140" height="62" rx="8"/>
  <text class="d-sub" x="490" y="152" text-anchor="middle">3..5</text>
  <text class="d-text" x="490" y="178" text-anchor="middle">outside, skip</text>
  <path class="d-edge-dashed" d="M 170 194 L 100 238"/>
  <path class="d-edge-dashed" d="M 250 194 L 320 238"/>
  <rect class="d-box-muted" x="30" y="240" width="140" height="48" rx="8"/>
  <text class="d-sub" x="100" y="270" text-anchor="middle">0..1 not touched</text>
  <rect class="d-box-muted" x="250" y="240" width="140" height="48" rx="8"/>
  <text class="d-sub" x="320" y="270" text-anchor="middle">2..2 not touched</text>
</svg>

Node 0..2 is fully covered by the update, so it absorbs the change and stores a lazy tag of 4. Its children are not visited at all; they will receive the +4 only if a later query or update needs to look inside 0..2.

📌 **Interview term: Lazy propagation** — postponing a range update at the highest fully covered nodes and pushing it to the children only when they are next visited, so that range updates cost O(log n).

📌 **Interview term: Push-down** — the step that moves a node's pending lazy tag to its two children (updating their values and their own tags) before the children are used.

Example 2 below builds a range-add / range-min tree this way and checks it against brute force on 2,000 random operations.

## 7. When Do You Need One?

A segment tree is more code than the alternatives, so reach for it only when they do not fit:

| Situation | Best tool | Why |
| :--- | :--- | :--- |
| Array never changes, range sums | [Prefix sums](/interview-question/what-is-the-prefix-sum-technique) | O(1) query after O(n) setup; trivial code |
| Point updates + range **sums** (or counts) | Fenwick tree (binary indexed tree) | Same O(log n), much shorter code — see [Count of smaller numbers after self with a Fenwick tree](/interview-question/count-of-smaller-numbers-after-self-with-fenwick-tree-how-to-coordinate-compress) |
| Point updates + range **min / max / gcd** | Segment tree | Min and max cannot be "subtracted", so the Fenwick prefix trick does not apply |
| Range updates + range queries | Segment tree with lazy propagation | The only one of these that handles both in O(log n) |
| Array never changes, range min / max | Sparse table | O(1) query after O(n log n) setup, no updates |
| Values inserted and deleted, order statistics | Balanced [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) with subtree sizes | Keyed by value, not by position |

Typical interview signals for a segment tree: "range minimum with updates", "count of elements in a range that changes", "add to a range then ask for the maximum", or a problem that needs a custom merge (for example the maximum subarray sum inside a range, where each node stores four numbers).

## 8. The Code in JavaScript

The JavaScript version keeps the tree in an \`Array\` of size \`4 * n\` filled with 0. Unlike Python, JavaScript default parameters **can** refer to \`this\`, so \`hi = this.n - 1\` works directly. \`(lo + hi) >> 1\` is a fast integer halving; it converts to a 32-bit integer, which is safe for any realistic array length. Numbers are 64-bit floats, so sums stay exact up to \`Number.MAX_SAFE_INTEGER\` (2^53 − 1).

~~~javascript
// Range sum + point update. Node 1 is the root; node i has children 2i and 2i+1.
class SegmentTree {
  constructor(values) {
    this.n = values.length;
    this.tree = new Array(4 * this.n).fill(0); // 4n is always enough room
    this.visited = 0;
    if (this.n) this.build(values, 1, 0, this.n - 1);
  }

  build(a, node, lo, hi) {
    if (lo === hi) {
      this.tree[node] = a[lo];
      return;
    }
    const mid = (lo + hi) >> 1;
    this.build(a, 2 * node, lo, mid);
    this.build(a, 2 * node + 1, mid + 1, hi);
    this.tree[node] = this.tree[2 * node] + this.tree[2 * node + 1];
  }

  update(i, value, node = 1, lo = 0, hi = this.n - 1) {
    this.visited++;
    if (lo === hi) {
      this.tree[node] = value;
      return;
    }
    const mid = (lo + hi) >> 1;
    if (i <= mid) this.update(i, value, 2 * node, lo, mid);
    else this.update(i, value, 2 * node + 1, mid + 1, hi);
    this.tree[node] = this.tree[2 * node] + this.tree[2 * node + 1];
  }

  // Sum of values[l..r], both ends included.
  query(l, r, node = 1, lo = 0, hi = this.n - 1) {
    this.visited++;
    if (r < lo || hi < l) return 0;                 // no overlap
    if (l <= lo && hi <= r) return this.tree[node]; // total overlap
    const mid = (lo + hi) >> 1;                     // partial overlap
    return this.query(l, r, 2 * node, lo, mid) + this.query(l, r, 2 * node + 1, mid + 1, hi);
  }
}
~~~

**What to point out in this code:**

- The three \`if\` lines in \`query\` *are* the algorithm: no overlap returns 0, total overlap returns the stored sum, partial overlap recurses.
- \`update\` recurses into exactly one child, then recomputes \`this.tree[node]\` on the way back up.
- \`new Array(4 * n).fill(0)\` matters: without \`fill\`, the slots are empty and \`undefined + 1\` is \`NaN\`.
- For a large tree, \`new Float64Array(4 * n)\` (zero-filled, compact) is a good alternative to a normal array.

### Lazy propagation in JavaScript

The lazy version adds a second array, \`lazy\`, and one helper, \`push\`. The rule to remember: **any time you are about to recurse into a node's children, push its tag first**; and after recursing in \`add\`, recompute the node from its children. The no-overlap value for a minimum is \`Infinity\`, which \`Math.min\` handles naturally.

~~~javascript
push(node) {
  if (this.lazy[node] !== 0) {
    for (const child of [2 * node, 2 * node + 1]) {
      this.mn[child] += this.lazy[node];
      this.lazy[child] += this.lazy[node];
    }
    this.lazy[node] = 0;
  }
}

add(l, r, delta, node = 1, lo = 0, hi = this.n - 1) {
  this.visited++;
  if (r < lo || hi < l) return;
  if (l <= lo && hi <= r) { // whole segment: tag it and stop here
    this.mn[node] += delta;
    this.lazy[node] += delta;
    return;
  }
  this.push(node);
  const mid = (lo + hi) >> 1;
  this.add(l, r, delta, 2 * node, lo, mid);
  this.add(l, r, delta, 2 * node + 1, mid + 1, hi);
  this.mn[node] = Math.min(this.mn[2 * node], this.mn[2 * node + 1]);
}

queryMin(l, r, node = 1, lo = 0, hi = this.n - 1) {
  this.visited++;
  if (r < lo || hi < l) return Infinity;
  if (l <= lo && hi <= r) return this.mn[node];
  this.push(node);
  const mid = (lo + hi) >> 1;
  return Math.min(this.queryMin(l, r, 2 * node, lo, mid), this.queryMin(l, r, 2 * node + 1, mid + 1, hi));
}
~~~

## 9. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22; the same file runs unchanged in the page). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. The random operations come from a small deterministic generator (MINSTD), so every language performs the identical sequence.

**Example 1 — the sum tree for \`[2, 1, 5, 3, 4]\`, then 3,000 random updates and queries against brute force** prints:

~~~text
level 0: [15]
level 1: [8, 7]
level 2: [3, 5, 3, 4]
level 3: [2, 1]
sum(1, 3) = 9
after a[2] = 10, sum(1, 3) = 14
sum(0, 4) = 20, sum(4, 4) = 4
n = 2000, 3000 random operations
brute force:  checksum 524696361, array cells read 1052316
segment tree: checksum 524696361, tree nodes visited 74213
~~~

The four "level" lines are the tree from section 3 read row by row. In the random test both methods produce the same checksum (the sum of all query answers), but brute force read **1,052,316** array cells while the segment tree visited **74,213** nodes for all updates and queries together — about 25 nodes per operation for n = 2,000.

**Example 2 — range add + range min with lazy propagation, checked against brute force** prints:

~~~text
min(0, 3) = 3
add 4 to [1, 4] -> min(0, 3) = 5, min(2, 5) = 4
add -10 to [0, 0] -> min(0, 5) = -5
n = 1000, 2000 random operations
queries matched brute force: 1002 / 1002
brute force cells touched by range adds: 326802
lazy tree nodes visited (adds and queries): 65910
~~~

After adding 4 to indexes 1..4 the array is \`[5, 7, 12, 10, 5, 4]\`, so \`min(0, 3)\` is 5 and \`min(2, 5)\` is 4; after adding −10 to index 0, the overall minimum is −5. On 2,000 random operations every one of the 1,002 queries matched brute force, and the range adds that cost brute force 326,802 cell writes were handled by the lazy tree in 65,910 node visits including all the queries.

## 10. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| Build | O(n) | each of the about 2n nodes is computed once from its children |
| Point update | O(log n) | one root-to-leaf path |
| Range query | O(log n) | at most 4 nodes per level (checked: at most 39 nodes for n = 1,000) |
| Range update with lazy propagation | O(log n) | same visiting pattern as a query, plus O(1) push-downs |

| Space | Bound | Why |
| :--- | :--- | :--- |
| Tree array | 4n slots | safe upper bound for the implicit layout (about 2n are actually used) |
| Lazy array | 4n slots | one pending tag per node |
| Recursion | O(log n) | the depth of the tree |

In JavaScript the arrays hold doubles; sums are exact up to 2^53 − 1. Use \`BigInt\` only if your totals can exceed that.

## 11. Edge Cases

- **Empty array** — guard the build (\`n == 0\`), or every query would recurse on the range 0..−1.
- **Single element** — the root is a leaf; queries and updates still work.
- **\`l > r\`** — decide whether that is an error or an empty range; example code swaps them before calling.
- **\`l == r\`** — a single-element query; it walks to one leaf (\`sum(4, 4) = 4\` in example 1).
- **Identity values** — the no-overlap result must be the identity of the merge: 0 for sum, +∞ for min, −∞ for max, 0 for gcd.
- **Negative numbers** — fine for sum and min (example 2 goes down to −5); they only matter if you assumed "0 means empty".

## Common Pitfalls

- **\`new Array(4 * n)\` without \`.fill(0)\`.** The slots are holes; reading one gives \`undefined\`, and \`undefined + 5\` is \`NaN\`.
- **Allocating \`2 * n\` for the recursive layout.** The midpoint split can need up to about 4n slots when n is not a power of two.
- **Returning the wrong identity.** \`return 0\` for a no-overlap *min* query silently returns 0 for any range of positive numbers; use \`Infinity\`.
- **Forgetting the push-down** before recursing in a lazy tree — children then answer with stale values.
- **\`Math.floor((lo + hi) / 2)\` vs \`>> 1\`.** Both are fine for array indexes; \`>> 1\` truncates to 32 bits, so never use it on values that can exceed 2^31.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">A binary tree over the array where each node stores the sum, min or max of one index range; the root covers everything, the leaves one element.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The query:</strong> <span style="color:#f0e2c8;">Three cases at each node: no overlap returns the identity, total overlap returns the stored value, partial overlap asks both children. O(log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The update:</strong> <span style="color:#f0e2c8;">Walk the one root-to-leaf path and recompute the parents: O(log n). Range updates use lazy tags pushed down only when needed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When to use it:</strong> <span style="color:#f0e2c8;">A changing array plus range queries. Prefix sums if it never changes, a Fenwick tree for sums with point updates, a segment tree for min/max/custom merges or range updates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array(4 * n).fill(0)</code> (or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Float64Array</code>); default parameters can use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this.n</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Infinity</code> as the min identity; sums exact up to 2^53 − 1.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not prefix sums?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prefix sums answer in O(1) but one point update shifts up to n of them. With a mix of updates and queries the segment tree's O(log n) for both wins.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Segment tree or Fenwick tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For sums with point updates a Fenwick tree is shorter and lighter. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gcd</code> or range updates, use a segment tree: a Fenwick tree relies on subtracting prefixes, and you cannot subtract a minimum.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the array size <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">4 * n</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The recursive layout needs at most twice the smallest power of two that is at least n, and that power is below 2n. With n = 6 the recursive layout already uses node index 13, past the 12 slots of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 * n</code>; for every n below 5000 the largest index stayed under 3.91 times n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does lazy propagation stay correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A fully covered node gets its value updated plus a tag; before any operation goes into its children, the tag is pushed down. So a node value is always correct, and children are fixed exactly when they are next read.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is a query O(log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At most two nodes per level are partially covered, so at most four per level are visited. We checked every range of a 1000-element tree: never more than 4 per level, 39 in total.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Range query** | A question about a slice a[l..r]: its sum, min, max… |
| **Point update** | Changing a single element a[i] |
| **Segment tree** | A binary tree whose nodes store an aggregate of one index range each |
| **Associative merge** | The combine operation (+, min, max, gcd); grouping must not change the result |
| **Implicit (array-based) tree** | A tree stored in an array: node i has children 2i and 2i + 1 |
| **Overlap cases** | No, total or partial overlap between a node range and the query range |
| **Lazy propagation** | Store a range update as a tag on covering nodes; push it down only when needed |
| **Push-down** | Moving a pending tag from a node to its two children before using them |

---
**Conclusion:** A segment tree stores the sum (or min, max, gcd) of every halving range of an array, so any range query is assembled from at most four nodes per level and any point update fixes one root-to-leaf path — both O(log n). In JavaScript it is a zero-filled array of size \`4 * n\` and three short recursive methods whose heart is the no / total / partial overlap test; lazy tags extend it to range updates. Use it when the array changes and the queries are ranges: prefer prefix sums for a static array and a Fenwick tree for plain sums, and say why.`,
        examples: [
          {
            label: `Sum segment tree: build, query, update, vs brute force`,
            code: `// Range sum + point update. Node 1 is the root; node i has children 2i and 2i+1.
class SegmentTree {
  constructor(values) {
    this.n = values.length;
    this.tree = new Array(4 * this.n).fill(0); // 4n is always enough room
    this.visited = 0;
    if (this.n) this.build(values, 1, 0, this.n - 1);
  }

  build(a, node, lo, hi) {
    if (lo === hi) {
      this.tree[node] = a[lo];
      return;
    }
    const mid = (lo + hi) >> 1;
    this.build(a, 2 * node, lo, mid);
    this.build(a, 2 * node + 1, mid + 1, hi);
    this.tree[node] = this.tree[2 * node] + this.tree[2 * node + 1];
  }

  update(i, value, node = 1, lo = 0, hi = this.n - 1) {
    this.visited++;
    if (lo === hi) {
      this.tree[node] = value;
      return;
    }
    const mid = (lo + hi) >> 1;
    if (i <= mid) this.update(i, value, 2 * node, lo, mid);
    else this.update(i, value, 2 * node + 1, mid + 1, hi);
    this.tree[node] = this.tree[2 * node] + this.tree[2 * node + 1];
  }

  // Sum of values[l..r], both ends included.
  query(l, r, node = 1, lo = 0, hi = this.n - 1) {
    this.visited++;
    if (r < lo || hi < l) return 0;                 // no overlap
    if (l <= lo && hi <= r) return this.tree[node]; // total overlap
    const mid = (lo + hi) >> 1;                     // partial overlap
    return this.query(l, r, 2 * node, lo, mid) + this.query(l, r, 2 * node + 1, mid + 1, hi);
  }

  levels() {
    const out = [];
    let row = [[1, 0, this.n - 1]];
    while (row.length) {
      out.push(row.map(([nd]) => this.tree[nd]));
      const next = [];
      for (const [nd, lo, hi] of row) {
        if (lo < hi) {
          const mid = (lo + hi) >> 1;
          next.push([2 * nd, lo, mid], [2 * nd + 1, mid + 1, hi]);
        }
      }
      row = next;
    }
    return out;
  }
}

const fmt = (xs) => "[" + xs.join(", ") + "]";

let st = new SegmentTree([2, 1, 5, 3, 4]);
st.levels().forEach((row, depth) => console.log("level " + depth + ": " + fmt(row)));
console.log("sum(1, 3) = " + st.query(1, 3));
st.update(2, 10);
console.log("after a[2] = 10, sum(1, 3) = " + st.query(1, 3));
console.log("sum(0, 4) = " + st.query(0, 4) + ", sum(4, 4) = " + st.query(4, 4));

let seed = 12345;
const nxt = () => (seed = (seed * 48271) % 2147483647);

const n = 2000;
const a = [];
for (let i = 0; i < n; i++) a.push(nxt() % 1000);
st = new SegmentTree(a);
let bruteSum = 0, treeSum = 0, cells = 0;
for (let op = 0; op < 3000; op++) {
  if (nxt() % 2 === 0) {
    const i = nxt() % n, v = nxt() % 1000;
    a[i] = v;
    st.update(i, v);
  } else {
    let l = nxt() % n, r = nxt() % n;
    if (l > r) [l, r] = [r, l];
    for (let k = l; k <= r; k++) bruteSum += a[k];
    cells += r - l + 1;
    treeSum += st.query(l, r);
  }
}
console.log("n = 2000, 3000 random operations");
console.log("brute force:  checksum " + bruteSum + ", array cells read " + cells);
console.log("segment tree: checksum " + treeSum + ", tree nodes visited " + st.visited);`,
          },
          {
            label: `Lazy propagation: range add + range min, vs brute force`,
            code: `// Range add + range min. lazy[node] = an add not yet pushed to the children.
class LazyMinTree {
  constructor(values) {
    this.n = values.length;
    this.mn = new Array(4 * this.n).fill(0);
    this.lazy = new Array(4 * this.n).fill(0);
    this.visited = 0;
    this.build(values, 1, 0, this.n - 1);
  }

  build(a, node, lo, hi) {
    if (lo === hi) {
      this.mn[node] = a[lo];
      return;
    }
    const mid = (lo + hi) >> 1;
    this.build(a, 2 * node, lo, mid);
    this.build(a, 2 * node + 1, mid + 1, hi);
    this.mn[node] = Math.min(this.mn[2 * node], this.mn[2 * node + 1]);
  }

  push(node) {
    if (this.lazy[node] !== 0) {
      for (const child of [2 * node, 2 * node + 1]) {
        this.mn[child] += this.lazy[node];
        this.lazy[child] += this.lazy[node];
      }
      this.lazy[node] = 0;
    }
  }

  add(l, r, delta, node = 1, lo = 0, hi = this.n - 1) {
    this.visited++;
    if (r < lo || hi < l) return;
    if (l <= lo && hi <= r) { // whole segment: tag it and stop here
      this.mn[node] += delta;
      this.lazy[node] += delta;
      return;
    }
    this.push(node);
    const mid = (lo + hi) >> 1;
    this.add(l, r, delta, 2 * node, lo, mid);
    this.add(l, r, delta, 2 * node + 1, mid + 1, hi);
    this.mn[node] = Math.min(this.mn[2 * node], this.mn[2 * node + 1]);
  }

  queryMin(l, r, node = 1, lo = 0, hi = this.n - 1) {
    this.visited++;
    if (r < lo || hi < l) return Infinity;
    if (l <= lo && hi <= r) return this.mn[node];
    this.push(node);
    const mid = (lo + hi) >> 1;
    return Math.min(this.queryMin(l, r, 2 * node, lo, mid), this.queryMin(l, r, 2 * node + 1, mid + 1, hi));
  }
}

let a = [5, 3, 8, 6, 1, 4];
let t = new LazyMinTree(a);
console.log("min(0, 3) = " + t.queryMin(0, 3));
t.add(1, 4, 4);
console.log("add 4 to [1, 4] -> min(0, 3) = " + t.queryMin(0, 3) + ", min(2, 5) = " + t.queryMin(2, 5));
t.add(0, 0, -10);
console.log("add -10 to [0, 0] -> min(0, 5) = " + t.queryMin(0, 5));

let seed = 99;
const nxt = () => (seed = (seed * 48271) % 2147483647);

const n = 1000;
a = [];
for (let i = 0; i < n; i++) a.push(nxt() % 1000);
t = new LazyMinTree(a);
let written = 0, matched = 0, queries = 0;
for (let op = 0; op < 2000; op++) {
  let l = nxt() % n, r = nxt() % n;
  if (l > r) [l, r] = [r, l];
  if (nxt() % 2 === 0) {
    const delta = (nxt() % 21) - 10; // -10 .. 10
    for (let k = l; k <= r; k++) a[k] += delta;
    written += r - l + 1;
    t.add(l, r, delta);
  } else {
    queries++;
    let brute = Infinity;
    for (let k = l; k <= r; k++) brute = Math.min(brute, a[k]);
    if (brute === t.queryMin(l, r)) matched++;
  }
}
console.log("n = 1000, 2000 random operations");
console.log("queries matched brute force: " + matched + " / " + queries);
console.log("brute force cells touched by range adds: " + written);
console.log("lazy tree nodes visited (adds and queries): " + t.visited);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"What is a segment tree? Explain how it answers a range-sum query and a point update, how big the array needs to be, and how you would support adding a value to a whole range. When would you choose it over prefix sums or a Fenwick tree? Show the core in Java."

**What a strong answer should cover:**
- Each node stores an aggregate of one index range; children split the range in half; about log₂ n levels; any associative merge (sum, min, max, gcd) works.
- Query with the no / total / partial overlap cases and update along one root-to-leaf path, both O(log n); build is O(n).
- The implicit array layout (children 2i and 2i + 1) and why 4n slots are enough.
- Lazy propagation for range updates: tag fully covered nodes and push tags down before visiting children.
- When to use it versus prefix sums (static array), a Fenwick tree (sums with point updates) and a sparse table (static min/max).
- Java details: a \`long[]\` tree so sums do not wrap past \`Integer.MAX_VALUE\`, \`(lo + hi) >>> 1\` for the midpoint, and \`Long.MAX_VALUE\` as the min identity.

**Code / implementation expected:** Optional — a recursive sum segment tree with \`update\` and \`query\` in Java; lazy propagation is usually discussed rather than fully coded.`,
        answer: `**Target Audience:** Developers comfortable with recursion and binary trees who want the main range-query structure.  
**Difficulty:** Hard  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A school has 1,000 classrooms in a row, and the head teacher keeps asking the same kind of question: *"How many students are in rooms 120 to 480 right now?"* Students move between rooms all day, so the numbers keep changing.

Counting room by room answers each question correctly but takes up to 1,000 steps. Writing down a running total once ("rooms 1 to k hold this many") makes each question instant — until one student moves, and then half of the running totals are wrong and must be rewritten.

The school's real fix is a chain of helpers. Every pair of neighbouring rooms has a helper who knows their combined total; every pair of those helpers has a supervisor who knows the total of four rooms; and so on up to one head helper who knows the whole school. When a student moves, only the helpers *above that room* update their number — about 10 of them for 1,000 rooms. When the head teacher asks about rooms 120 to 480, a handful of helpers whose blocks fit inside that range each shout their total, and the answer is their sum.

That chain of helpers is a **segment tree**. It is the tool for one specific situation: an array that **keeps changing** and **range questions** — sum, minimum, maximum — that keep coming.

## 2. The Problem It Solves

You have an array of n numbers and a stream of two kinds of operations, mixed together:

- **update(i, value)** — change one element;
- **query(l, r)** — the sum (or min, or max…) of the elements from index l to r.

📌 **Interview term: Range query** — a question about a contiguous slice \`a[l..r]\` of an array, such as its sum, minimum or maximum.

📌 **Interview term: Point update** — changing a single element \`a[i]\`.

The two simple approaches each fail one side:

| Approach | update | query | Problem |
| :--- | :--- | :--- | :--- |
| Plain array, add up the slice | O(1) | O(n) | Queries are slow |
| Prefix sums (see the [prefix sum technique](/interview-question/what-is-the-prefix-sum-technique)) | O(n) | O(1) | Every update rewrites up to n totals |
| **Segment tree** | **O(log n)** | **O(log n)** | Both fast |

With 100,000 elements and 100,000 operations, the plain array can need around 10^10 steps in the worst case; the segment tree needs roughly 100,000 × 2 × 17 ≈ 3.4 million, because log₂(100,000) ≈ 17. (If the notation is new, see [Big-O](/interview-question/what-is-big-o-notation).)

## 3. What a Segment Tree Is

A segment tree is a binary tree built over the array. Every node is responsible for a **segment** (a range of indexes) and stores the answer for that segment — here, its sum. The root covers the whole array. Each node splits its range in half and gives one half to each child. The leaves cover single elements.

📌 **Interview term: Segment tree** — a binary tree where each node stores an aggregate (sum, min, max, gcd…) of one contiguous range of the array, the root covering everything and each leaf one element.

Here it is for the array \`[2, 1, 5, 3, 4]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 358" role="img" aria-label="Segment tree for the array 2 1 5 3 4. Each node stores the sum of its index range. The root covers 0 to 4 with sum 15 and the leaves hold single values">
  <path class="d-edge" d="M 381 68 L 217 110"/>
  <path class="d-edge" d="M 381 68 L 545 110"/>
  <path class="d-edge" d="M 217 158 L 135 200"/>
  <path class="d-edge" d="M 217 158 L 300 200"/>
  <path class="d-edge" d="M 545 158 L 470 200"/>
  <path class="d-edge" d="M 545 158 L 620 200"/>
  <path class="d-edge" d="M 135 248 L 70 290"/>
  <path class="d-edge" d="M 135 248 L 200 290"/>
  <rect class="d-box" x="331" y="20" width="100" height="48" rx="8"/>
  <text class="d-sub" x="381" y="39" text-anchor="middle">0..4</text>
  <text class="d-text" x="381" y="59" text-anchor="middle">sum 15</text>
  <rect class="d-box" x="167" y="110" width="100" height="48" rx="8"/>
  <text class="d-sub" x="217" y="129" text-anchor="middle">0..2</text>
  <text class="d-text" x="217" y="149" text-anchor="middle">sum 8</text>
  <rect class="d-box" x="495" y="110" width="100" height="48" rx="8"/>
  <text class="d-sub" x="545" y="129" text-anchor="middle">3..4</text>
  <text class="d-text" x="545" y="149" text-anchor="middle">sum 7</text>
  <rect class="d-box" x="95" y="200" width="80" height="48" rx="8"/>
  <text class="d-sub" x="135" y="219" text-anchor="middle">0..1</text>
  <text class="d-text" x="135" y="239" text-anchor="middle">sum 3</text>
  <rect class="d-box-muted" x="260" y="200" width="80" height="48" rx="8"/>
  <text class="d-sub" x="300" y="219" text-anchor="middle">2..2</text>
  <text class="d-text" x="300" y="239" text-anchor="middle">sum 5</text>
  <rect class="d-box-muted" x="430" y="200" width="80" height="48" rx="8"/>
  <text class="d-sub" x="470" y="219" text-anchor="middle">3..3</text>
  <text class="d-text" x="470" y="239" text-anchor="middle">sum 3</text>
  <rect class="d-box-muted" x="580" y="200" width="80" height="48" rx="8"/>
  <text class="d-sub" x="620" y="219" text-anchor="middle">4..4</text>
  <text class="d-text" x="620" y="239" text-anchor="middle">sum 4</text>
  <rect class="d-box-muted" x="30" y="290" width="80" height="48" rx="8"/>
  <text class="d-sub" x="70" y="309" text-anchor="middle">0..0</text>
  <text class="d-text" x="70" y="329" text-anchor="middle">sum 2</text>
  <rect class="d-box-muted" x="160" y="290" width="80" height="48" rx="8"/>
  <text class="d-sub" x="200" y="309" text-anchor="middle">1..1</text>
  <text class="d-text" x="200" y="329" text-anchor="middle">sum 1</text>
</svg>

The root covers indexes 0..4 and stores 15. Its children cover 0..2 (sum 8) and 3..4 (sum 7), and so on down to single elements. Every internal node's value is the sum of its two children's values. Because the range halves at every level, the tree has about log₂ n levels.

📌 **Interview term: Associative merge** — the operation used to combine two children, such as \`+\`, \`min\`, \`max\` or \`gcd\`. It must be associative (\`(a ∘ b) ∘ c = a ∘ (b ∘ c)\`) so that combining halves gives the same answer as combining elements one by one. A segment tree works for any such operation, which is its big advantage over a Fenwick tree.

📌 **Interview term: Implicit (array-based) tree** — storing a tree in a plain array without pointers: node 1 is the root, and node i has children 2i and 2i + 1. A size of 4n is always enough: the tree has at most 2·P nodes, where P is the smallest power of two that is ≥ n, and P < 2n. We checked it: for n = 6 the recursive split already uses node index 13 (so \`2 * n\` slots are not enough), and for every n below 5,000 the largest node index stayed under 3.91·n.

## 4. Answering a Query: Three Cases

\`query(l, r)\` starts at the root and, at each node covering \`lo..hi\`, looks at how that range relates to \`l..r\`:

1. **No overlap** (\`r < lo\` or \`hi < l\`) — this node contributes nothing; return 0 (for a sum).
2. **Total overlap** (\`l ≤ lo\` and \`hi ≤ r\`) — the whole segment is wanted; return the stored value without going deeper.
3. **Partial overlap** — ask both children and add their answers.

📌 **Interview term: Overlap cases** — the no / total / partial classification of a node range against the query range; it is the whole query algorithm.

Here is \`query(1, 3)\` on the same tree:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 408" role="img" aria-label="Query for the sum of indexes 1 to 3. Nodes 1..1, 2..2 and 3..3 are fully inside and give 1, 5 and 3. Nodes 0..0 and 4..4 are outside. The rest are split">
  <rect class="d-box-accent" x="20" y="16" width="26" height="20" rx="4"/>
  <text class="d-sub" x="56" y="31">total overlap: use the stored sum</text>
  <rect class="d-box" x="330" y="16" width="26" height="20" rx="4"/>
  <text class="d-sub" x="366" y="31">partial: ask both children</text>
  <rect class="d-box-muted" x="580" y="16" width="26" height="20" rx="4"/>
  <text class="d-sub" x="616" y="31">no overlap</text>
  <path class="d-edge" d="M 381 118 L 217 160"/>
  <path class="d-edge" d="M 381 118 L 545 160"/>
  <path class="d-edge" d="M 217 208 L 135 250"/>
  <path class="d-edge" d="M 217 208 L 300 250"/>
  <path class="d-edge" d="M 545 208 L 470 250"/>
  <path class="d-edge" d="M 545 208 L 620 250"/>
  <path class="d-edge" d="M 135 298 L 70 340"/>
  <path class="d-edge" d="M 135 298 L 200 340"/>
  <rect class="d-box" x="331" y="70" width="100" height="48" rx="8"/>
  <text class="d-sub" x="381" y="89" text-anchor="middle">0..4</text>
  <text class="d-text" x="381" y="109" text-anchor="middle">split</text>
  <rect class="d-box" x="167" y="160" width="100" height="48" rx="8"/>
  <text class="d-sub" x="217" y="179" text-anchor="middle">0..2</text>
  <text class="d-text" x="217" y="199" text-anchor="middle">split</text>
  <rect class="d-box" x="495" y="160" width="100" height="48" rx="8"/>
  <text class="d-sub" x="545" y="179" text-anchor="middle">3..4</text>
  <text class="d-text" x="545" y="199" text-anchor="middle">split</text>
  <rect class="d-box" x="95" y="250" width="80" height="48" rx="8"/>
  <text class="d-sub" x="135" y="269" text-anchor="middle">0..1</text>
  <text class="d-text" x="135" y="289" text-anchor="middle">split</text>
  <rect class="d-box-accent" x="260" y="250" width="80" height="48" rx="8"/>
  <text class="d-sub" x="300" y="269" text-anchor="middle">2..2</text>
  <text class="d-text" x="300" y="289" text-anchor="middle">use 5</text>
  <rect class="d-box-accent" x="430" y="250" width="80" height="48" rx="8"/>
  <text class="d-sub" x="470" y="269" text-anchor="middle">3..3</text>
  <text class="d-text" x="470" y="289" text-anchor="middle">use 3</text>
  <rect class="d-box-muted" x="580" y="250" width="80" height="48" rx="8"/>
  <text class="d-sub" x="620" y="269" text-anchor="middle">4..4</text>
  <text class="d-text" x="620" y="289" text-anchor="middle">skip</text>
  <rect class="d-box-muted" x="30" y="340" width="80" height="48" rx="8"/>
  <text class="d-sub" x="70" y="359" text-anchor="middle">0..0</text>
  <text class="d-text" x="70" y="379" text-anchor="middle">skip</text>
  <rect class="d-box-accent" x="160" y="340" width="80" height="48" rx="8"/>
  <text class="d-sub" x="200" y="359" text-anchor="middle">1..1</text>
  <text class="d-text" x="200" y="379" text-anchor="middle">use 1</text>
</svg>

The answer is 1 + 5 + 3 = 9, assembled from three nodes that fit inside 1..3. Nodes 0..0 and 4..4 are outside and are dropped at once; everything else is split.

**Why it is O(log n):** at every level at most two nodes can be *partially* covered (the ones containing the left and right edges of the query), so at most four nodes per level are visited. We checked this by brute force: for a 1,000-element tree, over all 500,500 possible ranges, no level ever had more than 4 visited nodes and no query visited more than 39 nodes in total.

## 5. Point Update: Fix One Path

\`update(i, value)\` walks from the root down to the leaf for index i — choosing the left child if \`i ≤ mid\`, otherwise the right — sets the leaf, and on the way back up recomputes each parent from its two children. Only the about log₂ n nodes on that one path change. Setting \`a[2] = 10\` in the example changes the sums on the path 0..4 → 0..2 → 2..2, and \`query(1, 3)\` becomes 1 + 10 + 3 = 14.

## 6. Range Updates and Lazy Propagation

Sometimes the update is also a range: "add 4 to every element from 1 to 4". Doing that as many point updates costs O(n log n) per operation. **Lazy propagation** makes it O(log n) too.

The idea: when an update fully covers a node's segment, update that node's stored answer (for a min tree, adding 4 to every element adds 4 to the minimum) and **leave a note** — a *lazy tag* — saying "my children still owe +4". Do not go further down. Later, whenever any operation needs to pass through that node to its children, it first **pushes** the tag down one level.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Lazy propagation. Adding 4 to indexes 0 to 2 updates node 0..2 and stores a lazy tag of 4 there. Its children are not touched until a later query passes through">
  <rect class="d-box" x="290" y="20" width="120" height="56" rx="8"/>
  <text class="d-sub" x="350" y="42" text-anchor="middle">0..5</text>
  <text class="d-text" x="350" y="64" text-anchor="middle">partial</text>
  <path class="d-edge" d="M 330 78 L 210 128"/>
  <path class="d-edge" d="M 370 78 L 490 128"/>
  <rect class="d-box-accent" x="120" y="130" width="180" height="62" rx="8"/>
  <text class="d-sub" x="210" y="152" text-anchor="middle">0..2 fully covered</text>
  <text class="d-text" x="210" y="178" text-anchor="middle">min += 4, lazy = 4</text>
  <rect class="d-box-muted" x="420" y="130" width="140" height="62" rx="8"/>
  <text class="d-sub" x="490" y="152" text-anchor="middle">3..5</text>
  <text class="d-text" x="490" y="178" text-anchor="middle">outside, skip</text>
  <path class="d-edge-dashed" d="M 170 194 L 100 238"/>
  <path class="d-edge-dashed" d="M 250 194 L 320 238"/>
  <rect class="d-box-muted" x="30" y="240" width="140" height="48" rx="8"/>
  <text class="d-sub" x="100" y="270" text-anchor="middle">0..1 not touched</text>
  <rect class="d-box-muted" x="250" y="240" width="140" height="48" rx="8"/>
  <text class="d-sub" x="320" y="270" text-anchor="middle">2..2 not touched</text>
</svg>

Node 0..2 is fully covered by the update, so it absorbs the change and stores a lazy tag of 4. Its children are not visited at all; they will receive the +4 only if a later query or update needs to look inside 0..2.

📌 **Interview term: Lazy propagation** — postponing a range update at the highest fully covered nodes and pushing it to the children only when they are next visited, so that range updates cost O(log n).

📌 **Interview term: Push-down** — the step that moves a node's pending lazy tag to its two children (updating their values and their own tags) before the children are used.

Example 2 below builds a range-add / range-min tree this way and checks it against brute force on 2,000 random operations.

## 7. When Do You Need One?

A segment tree is more code than the alternatives, so reach for it only when they do not fit:

| Situation | Best tool | Why |
| :--- | :--- | :--- |
| Array never changes, range sums | [Prefix sums](/interview-question/what-is-the-prefix-sum-technique) | O(1) query after O(n) setup; trivial code |
| Point updates + range **sums** (or counts) | Fenwick tree (binary indexed tree) | Same O(log n), much shorter code — see [Count of smaller numbers after self with a Fenwick tree](/interview-question/count-of-smaller-numbers-after-self-with-fenwick-tree-how-to-coordinate-compress) |
| Point updates + range **min / max / gcd** | Segment tree | Min and max cannot be "subtracted", so the Fenwick prefix trick does not apply |
| Range updates + range queries | Segment tree with lazy propagation | The only one of these that handles both in O(log n) |
| Array never changes, range min / max | Sparse table | O(1) query after O(n log n) setup, no updates |
| Values inserted and deleted, order statistics | Balanced [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) with subtree sizes | Keyed by value, not by position |

Typical interview signals for a segment tree: "range minimum with updates", "count of elements in a range that changes", "add to a range then ask for the maximum", or a problem that needs a custom merge (for example the maximum subarray sum inside a range, where each node stores four numbers).

## 8. The Code in Java

The Java version keeps the tree in a \`long[]\` of size \`4 * n\` — \`long\`, because the sum of many \`int\` values can pass \`Integer.MAX_VALUE\` (2,147,483,647). Public \`query(l, r)\` and \`update(i, value)\` methods call private recursive overloads that carry \`node, lo, hi\`. The midpoint is \`(lo + hi) >>> 1\`; the unsigned shift gives the right answer even if \`lo + hi\` overflowed \`int\`.

~~~java
static class SegmentTree {
    final int n;
    final long[] tree;   // long: sums of many ints can pass Integer.MAX_VALUE
    long visited = 0;

    SegmentTree(int[] values) {
        n = values.length;
        tree = new long[4 * Math.max(1, n)]; // 4n is always enough room
        if (n > 0) build(values, 1, 0, n - 1);
    }

    void build(int[] a, int node, int lo, int hi) {
        if (lo == hi) {
            tree[node] = a[lo];
            return;
        }
        int mid = (lo + hi) >>> 1;
        build(a, 2 * node, lo, mid);
        build(a, 2 * node + 1, mid + 1, hi);
        tree[node] = tree[2 * node] + tree[2 * node + 1];
    }

    void update(int i, int value) { update(i, value, 1, 0, n - 1); }

    private void update(int i, int value, int node, int lo, int hi) {
        visited++;
        if (lo == hi) {
            tree[node] = value;
            return;
        }
        int mid = (lo + hi) >>> 1;
        if (i <= mid) update(i, value, 2 * node, lo, mid);
        else update(i, value, 2 * node + 1, mid + 1, hi);
        tree[node] = tree[2 * node] + tree[2 * node + 1];
    }

    // Sum of values[l..r], both ends included.
    long query(int l, int r) { return query(l, r, 1, 0, n - 1); }

    private long query(int l, int r, int node, int lo, int hi) {
        visited++;
        if (r < lo || hi < l) return 0;            // no overlap
        if (l <= lo && hi <= r) return tree[node]; // total overlap
        int mid = (lo + hi) >>> 1;                 // partial overlap
        return query(l, r, 2 * node, lo, mid) + query(l, r, 2 * node + 1, mid + 1, hi);
    }
}
~~~

**What to point out in this code:**

- The three \`if\` lines in \`query\` *are* the algorithm: no overlap returns 0, total overlap returns the stored sum, partial overlap recurses.
- \`update\` recurses into exactly one child, then recomputes \`tree[node]\` on the way back up.
- \`new long[4 * Math.max(1, n)]\` avoids a zero-length array for an empty input; \`long[]\` slots start at 0.
- The array is \`long[]\` but the input is \`int[]\`: \`tree[node] = a[lo]\` widens automatically, and every addition happens in \`long\`.

### Lazy propagation in Java

The lazy version adds a second array, \`lazy\`, and one helper, \`push\`. The rule to remember: **any time you are about to recurse into a node's children, push its tag first**; and after recursing in \`add\`, recompute the node from its children. The no-overlap value for a minimum is \`Long.MAX_VALUE\`; it is only ever passed to \`Math.min\`, never added to, so it cannot overflow.

~~~java
void push(int node) {
    if (lazy[node] != 0) {
        for (int child = 2 * node; child <= 2 * node + 1; child++) {
            mn[child] += lazy[node];
            lazy[child] += lazy[node];
        }
        lazy[node] = 0;
    }
}

void add(int l, int r, long delta) { add(l, r, delta, 1, 0, n - 1); }

private void add(int l, int r, long delta, int node, int lo, int hi) {
    visited++;
    if (r < lo || hi < l) return;
    if (l <= lo && hi <= r) { // whole segment: tag it and stop here
        mn[node] += delta;
        lazy[node] += delta;
        return;
    }
    push(node);
    int mid = (lo + hi) >>> 1;
    add(l, r, delta, 2 * node, lo, mid);
    add(l, r, delta, 2 * node + 1, mid + 1, hi);
    mn[node] = Math.min(mn[2 * node], mn[2 * node + 1]);
}

long queryMin(int l, int r) { return queryMin(l, r, 1, 0, n - 1); }

private long queryMin(int l, int r, int node, int lo, int hi) {
    visited++;
    if (r < lo || hi < l) return Long.MAX_VALUE;
    if (l <= lo && hi <= r) return mn[node];
    push(node);
    int mid = (lo + hi) >>> 1;
    return Math.min(queryMin(l, r, 2 * node, lo, mid), queryMin(l, r, 2 * node + 1, mid + 1, hi));
}
~~~

## 9. Verified: Running the Code

Each example was saved as one file and run with \`javac Main.java && java Main\` (JDK 21, compiled as Java 17+ source). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. The random operations come from a small deterministic generator (MINSTD), so every language performs the identical sequence.

**Example 1 — the sum tree for \`[2, 1, 5, 3, 4]\`, then 3,000 random updates and queries against brute force** prints:

~~~text
level 0: [15]
level 1: [8, 7]
level 2: [3, 5, 3, 4]
level 3: [2, 1]
sum(1, 3) = 9
after a[2] = 10, sum(1, 3) = 14
sum(0, 4) = 20, sum(4, 4) = 4
n = 2000, 3000 random operations
brute force:  checksum 524696361, array cells read 1052316
segment tree: checksum 524696361, tree nodes visited 74213
~~~

The four "level" lines are the tree from section 3 read row by row. In the random test both methods produce the same checksum (the sum of all query answers), but brute force read **1,052,316** array cells while the segment tree visited **74,213** nodes for all updates and queries together — about 25 nodes per operation for n = 2,000.

**Example 2 — range add + range min with lazy propagation, checked against brute force** prints:

~~~text
min(0, 3) = 3
add 4 to [1, 4] -> min(0, 3) = 5, min(2, 5) = 4
add -10 to [0, 0] -> min(0, 5) = -5
n = 1000, 2000 random operations
queries matched brute force: 1002 / 1002
brute force cells touched by range adds: 326802
lazy tree nodes visited (adds and queries): 65910
~~~

After adding 4 to indexes 1..4 the array is \`[5, 7, 12, 10, 5, 4]\`, so \`min(0, 3)\` is 5 and \`min(2, 5)\` is 4; after adding −10 to index 0, the overall minimum is −5. On 2,000 random operations every one of the 1,002 queries matched brute force, and the range adds that cost brute force 326,802 cell writes were handled by the lazy tree in 65,910 node visits including all the queries.

## 10. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| Build | O(n) | each of the about 2n nodes is computed once from its children |
| Point update | O(log n) | one root-to-leaf path |
| Range query | O(log n) | at most 4 nodes per level (checked: at most 39 nodes for n = 1,000) |
| Range update with lazy propagation | O(log n) | same visiting pattern as a query, plus O(1) push-downs |

| Space | Bound | Why |
| :--- | :--- | :--- |
| Tree array | 4n slots | safe upper bound for the implicit layout (about 2n are actually used) |
| Lazy array | 4n slots | one pending tag per node |
| Recursion | O(log n) | the depth of the tree |

In Java, use \`long\` for sums (as here); with \`int\` the totals silently wrap around past 2,147,483,647.

## 11. Edge Cases

- **Empty array** — guard the build (\`n == 0\`), or every query would recurse on the range 0..−1.
- **Single element** — the root is a leaf; queries and updates still work.
- **\`l > r\`** — decide whether that is an error or an empty range; example code swaps them before calling.
- **\`l == r\`** — a single-element query; it walks to one leaf (\`sum(4, 4) = 4\` in example 1).
- **Identity values** — the no-overlap result must be the identity of the merge: 0 for sum, +∞ for min, −∞ for max, 0 for gcd.
- **Negative numbers** — fine for sum and min (example 2 goes down to −5); they only matter if you assumed "0 means empty".

## Common Pitfalls

- **\`int[]\` tree for sums.** Totals above 2,147,483,647 wrap around to negative numbers without any error; use \`long[]\`.
- **Allocating \`2 * n\` for the recursive layout.** The midpoint split can need up to about 4n slots; \`ArrayIndexOutOfBoundsException\` appears only for some n, which makes the bug look random.
- **Returning the wrong identity.** \`return 0\` for a no-overlap *min* query gives 0 for any range of positive numbers; use \`Long.MAX_VALUE\`.
- **Forgetting the push-down** before recursing in a lazy tree — children then answer with stale values.
- **Adding to the identity.** \`Long.MAX_VALUE + delta\` overflows; only ever pass the identity to \`Math.min\`, never store it in a node that receives lazy adds.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">A binary tree over the array where each node stores the sum, min or max of one index range; the root covers everything, the leaves one element.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The query:</strong> <span style="color:#f0e2c8;">Three cases at each node: no overlap returns the identity, total overlap returns the stored value, partial overlap asks both children. O(log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The update:</strong> <span style="color:#f0e2c8;">Walk the one root-to-leaf path and recompute the parents: O(log n). Range updates use lazy tags pushed down only when needed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When to use it:</strong> <span style="color:#f0e2c8;">A changing array plus range queries. Prefix sums if it never changes, a Fenwick tree for sums with point updates, a segment tree for min/max/custom merges or range updates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long[4 * n]</code> so sums cannot wrap; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(lo + hi) &gt;&gt;&gt; 1</code> for the midpoint; public methods that call private recursive overloads.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not prefix sums?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prefix sums answer in O(1) but one point update shifts up to n of them. With a mix of updates and queries the segment tree's O(log n) for both wins.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Segment tree or Fenwick tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For sums with point updates a Fenwick tree is shorter and lighter. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gcd</code> or range updates, use a segment tree: a Fenwick tree relies on subtracting prefixes, and you cannot subtract a minimum.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the array size <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">4 * n</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The recursive layout needs at most twice the smallest power of two that is at least n, and that power is below 2n. With n = 6 the recursive layout already uses node index 13, past the 12 slots of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 * n</code>; for every n below 5000 the largest index stayed under 3.91 times n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does lazy propagation stay correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A fully covered node gets its value updated plus a tag; before any operation goes into its children, the tag is pushed down. So a node value is always correct, and children are fixed exactly when they are next read.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is a query O(log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At most two nodes per level are partially covered, so at most four per level are visited. We checked every range of a 1000-element tree: never more than 4 per level, 39 in total.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Range query** | A question about a slice a[l..r]: its sum, min, max… |
| **Point update** | Changing a single element a[i] |
| **Segment tree** | A binary tree whose nodes store an aggregate of one index range each |
| **Associative merge** | The combine operation (+, min, max, gcd); grouping must not change the result |
| **Implicit (array-based) tree** | A tree stored in an array: node i has children 2i and 2i + 1 |
| **Overlap cases** | No, total or partial overlap between a node range and the query range |
| **Lazy propagation** | Store a range update as a tag on covering nodes; push it down only when needed |
| **Push-down** | Moving a pending tag from a node to its two children before using them |

---
**Conclusion:** A segment tree stores the sum (or min, max, gcd) of every halving range of an array, so any range query is assembled from at most four nodes per level and any point update fixes one root-to-leaf path — both O(log n). In Java it is a \`long[4 * n]\` — \`long\` so the sums cannot wrap — plus recursive helpers built on the no / total / partial overlap test; lazy tags extend it to range updates. Use it when the array changes and the queries are ranges: prefer prefix sums for a static array and a Fenwick tree for plain sums, and say why.`,
        examples: [
          {
            label: `Sum segment tree: build, query, update, vs brute force`,
            code: `import java.util.ArrayList;
import java.util.List;
import java.util.StringJoiner;

public class Main {
    // Range sum + point update. Node 1 is the root; node i has children 2i and 2i+1.
    static class SegmentTree {
        final int n;
        final long[] tree;   // long: sums of many ints can pass Integer.MAX_VALUE
        long visited = 0;

        SegmentTree(int[] values) {
            n = values.length;
            tree = new long[4 * Math.max(1, n)]; // 4n is always enough room
            if (n > 0) build(values, 1, 0, n - 1);
        }

        void build(int[] a, int node, int lo, int hi) {
            if (lo == hi) {
                tree[node] = a[lo];
                return;
            }
            int mid = (lo + hi) >>> 1;
            build(a, 2 * node, lo, mid);
            build(a, 2 * node + 1, mid + 1, hi);
            tree[node] = tree[2 * node] + tree[2 * node + 1];
        }

        void update(int i, int value) { update(i, value, 1, 0, n - 1); }

        private void update(int i, int value, int node, int lo, int hi) {
            visited++;
            if (lo == hi) {
                tree[node] = value;
                return;
            }
            int mid = (lo + hi) >>> 1;
            if (i <= mid) update(i, value, 2 * node, lo, mid);
            else update(i, value, 2 * node + 1, mid + 1, hi);
            tree[node] = tree[2 * node] + tree[2 * node + 1];
        }

        // Sum of values[l..r], both ends included.
        long query(int l, int r) { return query(l, r, 1, 0, n - 1); }

        private long query(int l, int r, int node, int lo, int hi) {
            visited++;
            if (r < lo || hi < l) return 0;            // no overlap
            if (l <= lo && hi <= r) return tree[node]; // total overlap
            int mid = (lo + hi) >>> 1;                 // partial overlap
            return query(l, r, 2 * node, lo, mid) + query(l, r, 2 * node + 1, mid + 1, hi);
        }

        List<String> levels() {
            List<String> out = new ArrayList<>();
            List<int[]> row = new ArrayList<>();
            row.add(new int[]{1, 0, n - 1});
            while (!row.isEmpty()) {
                StringJoiner sj = new StringJoiner(", ", "[", "]");
                List<int[]> next = new ArrayList<>();
                for (int[] t : row) {
                    sj.add(String.valueOf(tree[t[0]]));
                    if (t[1] < t[2]) {
                        int mid = (t[1] + t[2]) >>> 1;
                        next.add(new int[]{2 * t[0], t[1], mid});
                        next.add(new int[]{2 * t[0] + 1, mid + 1, t[2]});
                    }
                }
                out.add(sj.toString());
                row = next;
            }
            return out;
        }
    }

    static long seed = 12345;
    static int nxt() {
        seed = seed * 48271 % 2147483647L;
        return (int) seed;
    }

    public static void main(String[] args) {
        SegmentTree st = new SegmentTree(new int[]{2, 1, 5, 3, 4});
        List<String> lv = st.levels();
        for (int d = 0; d < lv.size(); d++) System.out.println("level " + d + ": " + lv.get(d));
        System.out.println("sum(1, 3) = " + st.query(1, 3));
        st.update(2, 10);
        System.out.println("after a[2] = 10, sum(1, 3) = " + st.query(1, 3));
        System.out.println("sum(0, 4) = " + st.query(0, 4) + ", sum(4, 4) = " + st.query(4, 4));

        int n = 2000;
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = nxt() % 1000;
        st = new SegmentTree(a);
        long bruteSum = 0, treeSum = 0, cells = 0;
        for (int op = 0; op < 3000; op++) {
            if (nxt() % 2 == 0) {
                int i = nxt() % n, v = nxt() % 1000;
                a[i] = v;
                st.update(i, v);
            } else {
                int l = nxt() % n, r = nxt() % n;
                if (l > r) { int t = l; l = r; r = t; }
                for (int k = l; k <= r; k++) bruteSum += a[k];
                cells += r - l + 1;
                treeSum += st.query(l, r);
            }
        }
        System.out.println("n = 2000, 3000 random operations");
        System.out.println("brute force:  checksum " + bruteSum + ", array cells read " + cells);
        System.out.println("segment tree: checksum " + treeSum + ", tree nodes visited " + st.visited);
    }
}`,
          },
          {
            label: `Lazy propagation: range add + range min, vs brute force`,
            code: `public class Main {
    // Range add + range min. lazy[node] = an add not yet pushed to the children.
    static class LazyMinTree {
        final int n;
        final long[] mn, lazy;
        long visited = 0;

        LazyMinTree(long[] values) {
            n = values.length;
            mn = new long[4 * n];
            lazy = new long[4 * n];
            build(values, 1, 0, n - 1);
        }

        void build(long[] a, int node, int lo, int hi) {
            if (lo == hi) {
                mn[node] = a[lo];
                return;
            }
            int mid = (lo + hi) >>> 1;
            build(a, 2 * node, lo, mid);
            build(a, 2 * node + 1, mid + 1, hi);
            mn[node] = Math.min(mn[2 * node], mn[2 * node + 1]);
        }

        void push(int node) {
            if (lazy[node] != 0) {
                for (int child = 2 * node; child <= 2 * node + 1; child++) {
                    mn[child] += lazy[node];
                    lazy[child] += lazy[node];
                }
                lazy[node] = 0;
            }
        }

        void add(int l, int r, long delta) { add(l, r, delta, 1, 0, n - 1); }

        private void add(int l, int r, long delta, int node, int lo, int hi) {
            visited++;
            if (r < lo || hi < l) return;
            if (l <= lo && hi <= r) { // whole segment: tag it and stop here
                mn[node] += delta;
                lazy[node] += delta;
                return;
            }
            push(node);
            int mid = (lo + hi) >>> 1;
            add(l, r, delta, 2 * node, lo, mid);
            add(l, r, delta, 2 * node + 1, mid + 1, hi);
            mn[node] = Math.min(mn[2 * node], mn[2 * node + 1]);
        }

        long queryMin(int l, int r) { return queryMin(l, r, 1, 0, n - 1); }

        private long queryMin(int l, int r, int node, int lo, int hi) {
            visited++;
            if (r < lo || hi < l) return Long.MAX_VALUE;
            if (l <= lo && hi <= r) return mn[node];
            push(node);
            int mid = (lo + hi) >>> 1;
            return Math.min(queryMin(l, r, 2 * node, lo, mid), queryMin(l, r, 2 * node + 1, mid + 1, hi));
        }
    }

    static long seed = 99;
    static int nxt() {
        seed = seed * 48271 % 2147483647L;
        return (int) seed;
    }

    public static void main(String[] args) {
        LazyMinTree t = new LazyMinTree(new long[]{5, 3, 8, 6, 1, 4});
        System.out.println("min(0, 3) = " + t.queryMin(0, 3));
        t.add(1, 4, 4);
        System.out.println("add 4 to [1, 4] -> min(0, 3) = " + t.queryMin(0, 3) + ", min(2, 5) = " + t.queryMin(2, 5));
        t.add(0, 0, -10);
        System.out.println("add -10 to [0, 0] -> min(0, 5) = " + t.queryMin(0, 5));

        int n = 1000;
        long[] a = new long[n];
        for (int i = 0; i < n; i++) a[i] = nxt() % 1000;
        t = new LazyMinTree(a);
        long written = 0;
        int matched = 0, queries = 0;
        for (int op = 0; op < 2000; op++) {
            int l = nxt() % n, r = nxt() % n;
            if (l > r) { int tmp = l; l = r; r = tmp; }
            if (nxt() % 2 == 0) {
                int delta = nxt() % 21 - 10; // -10 .. 10
                for (int k = l; k <= r; k++) a[k] += delta;
                written += r - l + 1;
                t.add(l, r, delta);
            } else {
                queries++;
                long brute = Long.MAX_VALUE;
                for (int k = l; k <= r; k++) brute = Math.min(brute, a[k]);
                if (brute == t.queryMin(l, r)) matched++;
            }
        }
        System.out.println("n = 1000, 2000 random operations");
        System.out.println("queries matched brute force: " + matched + " / " + queries);
        System.out.println("brute force cells touched by range adds: " + written);
        System.out.println("lazy tree nodes visited (adds and queries): " + t.visited);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"What is a segment tree? Explain how it answers a range-sum query and a point update, how big the array needs to be, and how you would support adding a value to a whole range. When would you choose it over prefix sums or a Fenwick tree? Show the core in C++."

**What a strong answer should cover:**
- Each node stores an aggregate of one index range; children split the range in half; about log₂ n levels; any associative merge (sum, min, max, gcd) works.
- Query with the no / total / partial overlap cases and update along one root-to-leaf path, both O(log n); build is O(n).
- The implicit array layout (children 2i and 2i + 1) and why 4n slots are enough.
- Lazy propagation for range updates: tag fully covered nodes and push tags down before visiting children.
- When to use it versus prefix sums (static array), a Fenwick tree (sums with point updates) and a sparse table (static min/max).
- C++ details: \`std::vector<long long>\` because signed overflow is undefined behaviour, \`lo + (hi - lo) / 2\`, \`LLONG_MAX\` as the min identity, and unchecked \`operator[]\` if the array is undersized.

**Code / implementation expected:** Optional — a recursive sum segment tree with \`update\` and \`query\` in C++; lazy propagation is usually discussed rather than fully coded.`,
        answer: `**Target Audience:** Developers comfortable with recursion and binary trees who want the main range-query structure.  
**Difficulty:** Hard  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A school has 1,000 classrooms in a row, and the head teacher keeps asking the same kind of question: *"How many students are in rooms 120 to 480 right now?"* Students move between rooms all day, so the numbers keep changing.

Counting room by room answers each question correctly but takes up to 1,000 steps. Writing down a running total once ("rooms 1 to k hold this many") makes each question instant — until one student moves, and then half of the running totals are wrong and must be rewritten.

The school's real fix is a chain of helpers. Every pair of neighbouring rooms has a helper who knows their combined total; every pair of those helpers has a supervisor who knows the total of four rooms; and so on up to one head helper who knows the whole school. When a student moves, only the helpers *above that room* update their number — about 10 of them for 1,000 rooms. When the head teacher asks about rooms 120 to 480, a handful of helpers whose blocks fit inside that range each shout their total, and the answer is their sum.

That chain of helpers is a **segment tree**. It is the tool for one specific situation: an array that **keeps changing** and **range questions** — sum, minimum, maximum — that keep coming.

## 2. The Problem It Solves

You have an array of n numbers and a stream of two kinds of operations, mixed together:

- **update(i, value)** — change one element;
- **query(l, r)** — the sum (or min, or max…) of the elements from index l to r.

📌 **Interview term: Range query** — a question about a contiguous slice \`a[l..r]\` of an array, such as its sum, minimum or maximum.

📌 **Interview term: Point update** — changing a single element \`a[i]\`.

The two simple approaches each fail one side:

| Approach | update | query | Problem |
| :--- | :--- | :--- | :--- |
| Plain array, add up the slice | O(1) | O(n) | Queries are slow |
| Prefix sums (see the [prefix sum technique](/interview-question/what-is-the-prefix-sum-technique)) | O(n) | O(1) | Every update rewrites up to n totals |
| **Segment tree** | **O(log n)** | **O(log n)** | Both fast |

With 100,000 elements and 100,000 operations, the plain array can need around 10^10 steps in the worst case; the segment tree needs roughly 100,000 × 2 × 17 ≈ 3.4 million, because log₂(100,000) ≈ 17. (If the notation is new, see [Big-O](/interview-question/what-is-big-o-notation).)

## 3. What a Segment Tree Is

A segment tree is a binary tree built over the array. Every node is responsible for a **segment** (a range of indexes) and stores the answer for that segment — here, its sum. The root covers the whole array. Each node splits its range in half and gives one half to each child. The leaves cover single elements.

📌 **Interview term: Segment tree** — a binary tree where each node stores an aggregate (sum, min, max, gcd…) of one contiguous range of the array, the root covering everything and each leaf one element.

Here it is for the array \`[2, 1, 5, 3, 4]\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 358" role="img" aria-label="Segment tree for the array 2 1 5 3 4. Each node stores the sum of its index range. The root covers 0 to 4 with sum 15 and the leaves hold single values">
  <path class="d-edge" d="M 381 68 L 217 110"/>
  <path class="d-edge" d="M 381 68 L 545 110"/>
  <path class="d-edge" d="M 217 158 L 135 200"/>
  <path class="d-edge" d="M 217 158 L 300 200"/>
  <path class="d-edge" d="M 545 158 L 470 200"/>
  <path class="d-edge" d="M 545 158 L 620 200"/>
  <path class="d-edge" d="M 135 248 L 70 290"/>
  <path class="d-edge" d="M 135 248 L 200 290"/>
  <rect class="d-box" x="331" y="20" width="100" height="48" rx="8"/>
  <text class="d-sub" x="381" y="39" text-anchor="middle">0..4</text>
  <text class="d-text" x="381" y="59" text-anchor="middle">sum 15</text>
  <rect class="d-box" x="167" y="110" width="100" height="48" rx="8"/>
  <text class="d-sub" x="217" y="129" text-anchor="middle">0..2</text>
  <text class="d-text" x="217" y="149" text-anchor="middle">sum 8</text>
  <rect class="d-box" x="495" y="110" width="100" height="48" rx="8"/>
  <text class="d-sub" x="545" y="129" text-anchor="middle">3..4</text>
  <text class="d-text" x="545" y="149" text-anchor="middle">sum 7</text>
  <rect class="d-box" x="95" y="200" width="80" height="48" rx="8"/>
  <text class="d-sub" x="135" y="219" text-anchor="middle">0..1</text>
  <text class="d-text" x="135" y="239" text-anchor="middle">sum 3</text>
  <rect class="d-box-muted" x="260" y="200" width="80" height="48" rx="8"/>
  <text class="d-sub" x="300" y="219" text-anchor="middle">2..2</text>
  <text class="d-text" x="300" y="239" text-anchor="middle">sum 5</text>
  <rect class="d-box-muted" x="430" y="200" width="80" height="48" rx="8"/>
  <text class="d-sub" x="470" y="219" text-anchor="middle">3..3</text>
  <text class="d-text" x="470" y="239" text-anchor="middle">sum 3</text>
  <rect class="d-box-muted" x="580" y="200" width="80" height="48" rx="8"/>
  <text class="d-sub" x="620" y="219" text-anchor="middle">4..4</text>
  <text class="d-text" x="620" y="239" text-anchor="middle">sum 4</text>
  <rect class="d-box-muted" x="30" y="290" width="80" height="48" rx="8"/>
  <text class="d-sub" x="70" y="309" text-anchor="middle">0..0</text>
  <text class="d-text" x="70" y="329" text-anchor="middle">sum 2</text>
  <rect class="d-box-muted" x="160" y="290" width="80" height="48" rx="8"/>
  <text class="d-sub" x="200" y="309" text-anchor="middle">1..1</text>
  <text class="d-text" x="200" y="329" text-anchor="middle">sum 1</text>
</svg>

The root covers indexes 0..4 and stores 15. Its children cover 0..2 (sum 8) and 3..4 (sum 7), and so on down to single elements. Every internal node's value is the sum of its two children's values. Because the range halves at every level, the tree has about log₂ n levels.

📌 **Interview term: Associative merge** — the operation used to combine two children, such as \`+\`, \`min\`, \`max\` or \`gcd\`. It must be associative (\`(a ∘ b) ∘ c = a ∘ (b ∘ c)\`) so that combining halves gives the same answer as combining elements one by one. A segment tree works for any such operation, which is its big advantage over a Fenwick tree.

📌 **Interview term: Implicit (array-based) tree** — storing a tree in a plain array without pointers: node 1 is the root, and node i has children 2i and 2i + 1. A size of 4n is always enough: the tree has at most 2·P nodes, where P is the smallest power of two that is ≥ n, and P < 2n. We checked it: for n = 6 the recursive split already uses node index 13 (so \`2 * n\` slots are not enough), and for every n below 5,000 the largest node index stayed under 3.91·n.

## 4. Answering a Query: Three Cases

\`query(l, r)\` starts at the root and, at each node covering \`lo..hi\`, looks at how that range relates to \`l..r\`:

1. **No overlap** (\`r < lo\` or \`hi < l\`) — this node contributes nothing; return 0 (for a sum).
2. **Total overlap** (\`l ≤ lo\` and \`hi ≤ r\`) — the whole segment is wanted; return the stored value without going deeper.
3. **Partial overlap** — ask both children and add their answers.

📌 **Interview term: Overlap cases** — the no / total / partial classification of a node range against the query range; it is the whole query algorithm.

Here is \`query(1, 3)\` on the same tree:

<svg class="iq-diagram" width="100%" viewBox="0 0 700 408" role="img" aria-label="Query for the sum of indexes 1 to 3. Nodes 1..1, 2..2 and 3..3 are fully inside and give 1, 5 and 3. Nodes 0..0 and 4..4 are outside. The rest are split">
  <rect class="d-box-accent" x="20" y="16" width="26" height="20" rx="4"/>
  <text class="d-sub" x="56" y="31">total overlap: use the stored sum</text>
  <rect class="d-box" x="330" y="16" width="26" height="20" rx="4"/>
  <text class="d-sub" x="366" y="31">partial: ask both children</text>
  <rect class="d-box-muted" x="580" y="16" width="26" height="20" rx="4"/>
  <text class="d-sub" x="616" y="31">no overlap</text>
  <path class="d-edge" d="M 381 118 L 217 160"/>
  <path class="d-edge" d="M 381 118 L 545 160"/>
  <path class="d-edge" d="M 217 208 L 135 250"/>
  <path class="d-edge" d="M 217 208 L 300 250"/>
  <path class="d-edge" d="M 545 208 L 470 250"/>
  <path class="d-edge" d="M 545 208 L 620 250"/>
  <path class="d-edge" d="M 135 298 L 70 340"/>
  <path class="d-edge" d="M 135 298 L 200 340"/>
  <rect class="d-box" x="331" y="70" width="100" height="48" rx="8"/>
  <text class="d-sub" x="381" y="89" text-anchor="middle">0..4</text>
  <text class="d-text" x="381" y="109" text-anchor="middle">split</text>
  <rect class="d-box" x="167" y="160" width="100" height="48" rx="8"/>
  <text class="d-sub" x="217" y="179" text-anchor="middle">0..2</text>
  <text class="d-text" x="217" y="199" text-anchor="middle">split</text>
  <rect class="d-box" x="495" y="160" width="100" height="48" rx="8"/>
  <text class="d-sub" x="545" y="179" text-anchor="middle">3..4</text>
  <text class="d-text" x="545" y="199" text-anchor="middle">split</text>
  <rect class="d-box" x="95" y="250" width="80" height="48" rx="8"/>
  <text class="d-sub" x="135" y="269" text-anchor="middle">0..1</text>
  <text class="d-text" x="135" y="289" text-anchor="middle">split</text>
  <rect class="d-box-accent" x="260" y="250" width="80" height="48" rx="8"/>
  <text class="d-sub" x="300" y="269" text-anchor="middle">2..2</text>
  <text class="d-text" x="300" y="289" text-anchor="middle">use 5</text>
  <rect class="d-box-accent" x="430" y="250" width="80" height="48" rx="8"/>
  <text class="d-sub" x="470" y="269" text-anchor="middle">3..3</text>
  <text class="d-text" x="470" y="289" text-anchor="middle">use 3</text>
  <rect class="d-box-muted" x="580" y="250" width="80" height="48" rx="8"/>
  <text class="d-sub" x="620" y="269" text-anchor="middle">4..4</text>
  <text class="d-text" x="620" y="289" text-anchor="middle">skip</text>
  <rect class="d-box-muted" x="30" y="340" width="80" height="48" rx="8"/>
  <text class="d-sub" x="70" y="359" text-anchor="middle">0..0</text>
  <text class="d-text" x="70" y="379" text-anchor="middle">skip</text>
  <rect class="d-box-accent" x="160" y="340" width="80" height="48" rx="8"/>
  <text class="d-sub" x="200" y="359" text-anchor="middle">1..1</text>
  <text class="d-text" x="200" y="379" text-anchor="middle">use 1</text>
</svg>

The answer is 1 + 5 + 3 = 9, assembled from three nodes that fit inside 1..3. Nodes 0..0 and 4..4 are outside and are dropped at once; everything else is split.

**Why it is O(log n):** at every level at most two nodes can be *partially* covered (the ones containing the left and right edges of the query), so at most four nodes per level are visited. We checked this by brute force: for a 1,000-element tree, over all 500,500 possible ranges, no level ever had more than 4 visited nodes and no query visited more than 39 nodes in total.

## 5. Point Update: Fix One Path

\`update(i, value)\` walks from the root down to the leaf for index i — choosing the left child if \`i ≤ mid\`, otherwise the right — sets the leaf, and on the way back up recomputes each parent from its two children. Only the about log₂ n nodes on that one path change. Setting \`a[2] = 10\` in the example changes the sums on the path 0..4 → 0..2 → 2..2, and \`query(1, 3)\` becomes 1 + 10 + 3 = 14.

## 6. Range Updates and Lazy Propagation

Sometimes the update is also a range: "add 4 to every element from 1 to 4". Doing that as many point updates costs O(n log n) per operation. **Lazy propagation** makes it O(log n) too.

The idea: when an update fully covers a node's segment, update that node's stored answer (for a min tree, adding 4 to every element adds 4 to the minimum) and **leave a note** — a *lazy tag* — saying "my children still owe +4". Do not go further down. Later, whenever any operation needs to pass through that node to its children, it first **pushes** the tag down one level.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Lazy propagation. Adding 4 to indexes 0 to 2 updates node 0..2 and stores a lazy tag of 4 there. Its children are not touched until a later query passes through">
  <rect class="d-box" x="290" y="20" width="120" height="56" rx="8"/>
  <text class="d-sub" x="350" y="42" text-anchor="middle">0..5</text>
  <text class="d-text" x="350" y="64" text-anchor="middle">partial</text>
  <path class="d-edge" d="M 330 78 L 210 128"/>
  <path class="d-edge" d="M 370 78 L 490 128"/>
  <rect class="d-box-accent" x="120" y="130" width="180" height="62" rx="8"/>
  <text class="d-sub" x="210" y="152" text-anchor="middle">0..2 fully covered</text>
  <text class="d-text" x="210" y="178" text-anchor="middle">min += 4, lazy = 4</text>
  <rect class="d-box-muted" x="420" y="130" width="140" height="62" rx="8"/>
  <text class="d-sub" x="490" y="152" text-anchor="middle">3..5</text>
  <text class="d-text" x="490" y="178" text-anchor="middle">outside, skip</text>
  <path class="d-edge-dashed" d="M 170 194 L 100 238"/>
  <path class="d-edge-dashed" d="M 250 194 L 320 238"/>
  <rect class="d-box-muted" x="30" y="240" width="140" height="48" rx="8"/>
  <text class="d-sub" x="100" y="270" text-anchor="middle">0..1 not touched</text>
  <rect class="d-box-muted" x="250" y="240" width="140" height="48" rx="8"/>
  <text class="d-sub" x="320" y="270" text-anchor="middle">2..2 not touched</text>
</svg>

Node 0..2 is fully covered by the update, so it absorbs the change and stores a lazy tag of 4. Its children are not visited at all; they will receive the +4 only if a later query or update needs to look inside 0..2.

📌 **Interview term: Lazy propagation** — postponing a range update at the highest fully covered nodes and pushing it to the children only when they are next visited, so that range updates cost O(log n).

📌 **Interview term: Push-down** — the step that moves a node's pending lazy tag to its two children (updating their values and their own tags) before the children are used.

Example 2 below builds a range-add / range-min tree this way and checks it against brute force on 2,000 random operations.

## 7. When Do You Need One?

A segment tree is more code than the alternatives, so reach for it only when they do not fit:

| Situation | Best tool | Why |
| :--- | :--- | :--- |
| Array never changes, range sums | [Prefix sums](/interview-question/what-is-the-prefix-sum-technique) | O(1) query after O(n) setup; trivial code |
| Point updates + range **sums** (or counts) | Fenwick tree (binary indexed tree) | Same O(log n), much shorter code — see [Count of smaller numbers after self with a Fenwick tree](/interview-question/count-of-smaller-numbers-after-self-with-fenwick-tree-how-to-coordinate-compress) |
| Point updates + range **min / max / gcd** | Segment tree | Min and max cannot be "subtracted", so the Fenwick prefix trick does not apply |
| Range updates + range queries | Segment tree with lazy propagation | The only one of these that handles both in O(log n) |
| Array never changes, range min / max | Sparse table | O(1) query after O(n log n) setup, no updates |
| Values inserted and deleted, order statistics | Balanced [binary search tree](/interview-question/what-is-a-binary-search-tree-bst) with subtree sizes | Keyed by value, not by position |

Typical interview signals for a segment tree: "range minimum with updates", "count of elements in a range that changes", "add to a range then ask for the maximum", or a problem that needs a custom merge (for example the maximum subarray sum inside a range, where each node stores four numbers).

## 8. The Code in C++

The C++ version keeps the tree in a \`std::vector<long long>\` of size \`4 * n\` — \`long long\`, because summing many \`int\` values can overflow \`int\`, and signed overflow is undefined behaviour in C++. Public \`query\`/\`update\` call private recursive overloads that carry \`node, lo, hi\`. The midpoint is \`lo + (hi - lo) / 2\`, which cannot overflow.

~~~cpp
class SegmentTree {
public:
    long long visited = 0;

    explicit SegmentTree(const std::vector<int>& values)
        : n(static_cast<int>(values.size())), tree(4 * std::max(1, n), 0) { // 4n is always enough room
        if (n > 0) build(values, 1, 0, n - 1);
    }

    void update(int i, int value) { update(i, value, 1, 0, n - 1); }

    // Sum of values[l..r], both ends included.
    long long query(int l, int r) { return query(l, r, 1, 0, n - 1); }

    // levels() (prints the tree) is in the full example

private:
    int n;
    std::vector<long long> tree; // long long: sums of many ints can overflow int

    void build(const std::vector<int>& a, int node, int lo, int hi) {
        if (lo == hi) {
            tree[node] = a[lo];
            return;
        }
        int mid = lo + (hi - lo) / 2;
        build(a, 2 * node, lo, mid);
        build(a, 2 * node + 1, mid + 1, hi);
        tree[node] = tree[2 * node] + tree[2 * node + 1];
    }

    void update(int i, int value, int node, int lo, int hi) {
        visited++;
        if (lo == hi) {
            tree[node] = value;
            return;
        }
        int mid = lo + (hi - lo) / 2;
        if (i <= mid) update(i, value, 2 * node, lo, mid);
        else update(i, value, 2 * node + 1, mid + 1, hi);
        tree[node] = tree[2 * node] + tree[2 * node + 1];
    }

    long long query(int l, int r, int node, int lo, int hi) {
        visited++;
        if (r < lo || hi < l) return 0;            // no overlap
        if (l <= lo && hi <= r) return tree[node]; // total overlap
        int mid = lo + (hi - lo) / 2;              // partial overlap
        return query(l, r, 2 * node, lo, mid) + query(l, r, 2 * node + 1, mid + 1, hi);
    }
};
~~~

**What to point out in this code:**

- The three \`if\` lines in \`query\` *are* the algorithm: no overlap returns 0, total overlap returns the stored sum, partial overlap recurses.
- \`update\` recurses into exactly one child, then recomputes \`tree[node]\` on the way back up.
- \`tree(4 * std::max(1, n), 0)\` in the member-initialiser list sizes and zero-fills the vector. Members are initialised in **declaration** order (\`n\` before \`tree\` here), not the order written in the list — reversing the declarations would read \`n\` before it is set.
- \`explicit\` on the constructor stops an accidental conversion from a \`std::vector<int>\` to a \`SegmentTree\`.

### Lazy propagation in C++

The lazy version adds a second vector, \`lazy\`, and one helper, \`push\`. The rule to remember: **any time you are about to recurse into a node's children, push its tag first**; and after recursing in \`add\`, recompute the node from its children. The no-overlap value for a minimum is \`LLONG_MAX\` from \`<climits>\`; it is only passed to \`std::min\`, never added to, so it cannot overflow.

~~~cpp
void push(int node) {
    if (lazy[node] != 0) {
        for (int child : {2 * node, 2 * node + 1}) {
            mn[child] += lazy[node];
            lazy[child] += lazy[node];
        }
        lazy[node] = 0;
    }
}

void add(int l, int r, long long delta, int node, int lo, int hi) {
    visited++;
    if (r < lo || hi < l) return;
    if (l <= lo && hi <= r) { // whole segment: tag it and stop here
        mn[node] += delta;
        lazy[node] += delta;
        return;
    }
    push(node);
    int mid = lo + (hi - lo) / 2;
    add(l, r, delta, 2 * node, lo, mid);
    add(l, r, delta, 2 * node + 1, mid + 1, hi);
    mn[node] = std::min(mn[2 * node], mn[2 * node + 1]);
}

long long queryMin(int l, int r, int node, int lo, int hi) {
    visited++;
    if (r < lo || hi < l) return LLONG_MAX;
    if (l <= lo && hi <= r) return mn[node];
    push(node);
    int mid = lo + (hi - lo) / 2;
    return std::min(queryMin(l, r, 2 * node, lo, mid), queryMin(l, r, 2 * node + 1, mid + 1, hi));
}
~~~

## 9. Verified: Running the Code

Each example was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. The random operations come from a small deterministic generator (MINSTD), so every language performs the identical sequence.

**Example 1 — the sum tree for \`[2, 1, 5, 3, 4]\`, then 3,000 random updates and queries against brute force** prints:

~~~text
level 0: [15]
level 1: [8, 7]
level 2: [3, 5, 3, 4]
level 3: [2, 1]
sum(1, 3) = 9
after a[2] = 10, sum(1, 3) = 14
sum(0, 4) = 20, sum(4, 4) = 4
n = 2000, 3000 random operations
brute force:  checksum 524696361, array cells read 1052316
segment tree: checksum 524696361, tree nodes visited 74213
~~~

The four "level" lines are the tree from section 3 read row by row. In the random test both methods produce the same checksum (the sum of all query answers), but brute force read **1,052,316** array cells while the segment tree visited **74,213** nodes for all updates and queries together — about 25 nodes per operation for n = 2,000.

**Example 2 — range add + range min with lazy propagation, checked against brute force** prints:

~~~text
min(0, 3) = 3
add 4 to [1, 4] -> min(0, 3) = 5, min(2, 5) = 4
add -10 to [0, 0] -> min(0, 5) = -5
n = 1000, 2000 random operations
queries matched brute force: 1002 / 1002
brute force cells touched by range adds: 326802
lazy tree nodes visited (adds and queries): 65910
~~~

After adding 4 to indexes 1..4 the array is \`[5, 7, 12, 10, 5, 4]\`, so \`min(0, 3)\` is 5 and \`min(2, 5)\` is 4; after adding −10 to index 0, the overall minimum is −5. On 2,000 random operations every one of the 1,002 queries matched brute force, and the range adds that cost brute force 326,802 cell writes were handled by the lazy tree in 65,910 node visits including all the queries.

## 10. Complexity

| Operation | Time | Why |
| :--- | :--- | :--- |
| Build | O(n) | each of the about 2n nodes is computed once from its children |
| Point update | O(log n) | one root-to-leaf path |
| Range query | O(log n) | at most 4 nodes per level (checked: at most 39 nodes for n = 1,000) |
| Range update with lazy propagation | O(log n) | same visiting pattern as a query, plus O(1) push-downs |

| Space | Bound | Why |
| :--- | :--- | :--- |
| Tree array | 4n slots | safe upper bound for the implicit layout (about 2n are actually used) |
| Lazy array | 4n slots | one pending tag per node |
| Recursion | O(log n) | the depth of the tree |

In C++, use \`long long\` for sums (as here); with \`int\`, overflow is undefined behaviour, not just a wrong number.

## 11. Edge Cases

- **Empty array** — guard the build (\`n == 0\`), or every query would recurse on the range 0..−1.
- **Single element** — the root is a leaf; queries and updates still work.
- **\`l > r\`** — decide whether that is an error or an empty range; example code swaps them before calling.
- **\`l == r\`** — a single-element query; it walks to one leaf (\`sum(4, 4) = 4\` in example 1).
- **Identity values** — the no-overlap result must be the identity of the merge: 0 for sum, +∞ for min, −∞ for max, 0 for gcd.
- **Negative numbers** — fine for sum and min (example 2 goes down to −5); they only matter if you assumed "0 means empty".

## Common Pitfalls

- **\`int\` sums.** Signed overflow is undefined behaviour in C++; use \`long long\` for the tree.
- **Allocating \`2 * n\` for the recursive layout.** The midpoint split can need up to about 4n slots; \`std::vector::operator[]\` does not check bounds, so the bug corrupts memory instead of failing.
- **Returning the wrong identity.** \`return 0\` for a no-overlap *min* query gives 0 for any positive range; use \`LLONG_MAX\`.
- **Forgetting the push-down** before recursing in a lazy tree — children then answer with stale values.
- **\`(lo + hi) / 2\` on very large indexes** can overflow \`int\`; \`lo + (hi - lo) / 2\` cannot.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">A binary tree over the array where each node stores the sum, min or max of one index range; the root covers everything, the leaves one element.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The query:</strong> <span style="color:#f0e2c8;">Three cases at each node: no overlap returns the identity, total overlap returns the stored value, partial overlap asks both children. O(log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The update:</strong> <span style="color:#f0e2c8;">Walk the one root-to-leaf path and recompute the parents: O(log n). Range updates use lazy tags pushed down only when needed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When to use it:</strong> <span style="color:#f0e2c8;">A changing array plus range queries. Prefix sums if it never changes, a Fenwick tree for sums with point updates, a segment tree for min/max/custom merges or range updates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::vector&lt;long long&gt;(4 * n)</code> so sums cannot overflow; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lo + (hi - lo) / 2</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LLONG_MAX</code> as the min identity.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not prefix sums?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prefix sums answer in O(1) but one point update shifts up to n of them. With a mix of updates and queries the segment tree's O(log n) for both wins.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Segment tree or Fenwick tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For sums with point updates a Fenwick tree is shorter and lighter. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gcd</code> or range updates, use a segment tree: a Fenwick tree relies on subtracting prefixes, and you cannot subtract a minimum.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the array size <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">4 * n</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The recursive layout needs at most twice the smallest power of two that is at least n, and that power is below 2n. With n = 6 the recursive layout already uses node index 13, past the 12 slots of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 * n</code>; for every n below 5000 the largest index stayed under 3.91 times n.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does lazy propagation stay correct?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A fully covered node gets its value updated plus a tag; before any operation goes into its children, the tag is pushed down. So a node value is always correct, and children are fixed exactly when they are next read.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is a query O(log n)?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At most two nodes per level are partially covered, so at most four per level are visited. We checked every range of a 1000-element tree: never more than 4 per level, 39 in total.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Range query** | A question about a slice a[l..r]: its sum, min, max… |
| **Point update** | Changing a single element a[i] |
| **Segment tree** | A binary tree whose nodes store an aggregate of one index range each |
| **Associative merge** | The combine operation (+, min, max, gcd); grouping must not change the result |
| **Implicit (array-based) tree** | A tree stored in an array: node i has children 2i and 2i + 1 |
| **Overlap cases** | No, total or partial overlap between a node range and the query range |
| **Lazy propagation** | Store a range update as a tag on covering nodes; push it down only when needed |
| **Push-down** | Moving a pending tag from a node to its two children before using them |

---
**Conclusion:** A segment tree stores the sum (or min, max, gcd) of every halving range of an array, so any range query is assembled from at most four nodes per level and any point update fixes one root-to-leaf path — both O(log n). In C++ it is a \`std::vector<long long>\` of size \`4 * n\` — \`long long\` because signed overflow is undefined behaviour — plus recursive helpers built on the no / total / partial overlap test; lazy tags extend it to range updates. Use it when the array changes and the queries are ranges: prefer prefix sums for a static array and a Fenwick tree for plain sums, and say why.`,
        examples: [
          {
            label: `Sum segment tree: build, query, update, vs brute force`,
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <tuple>
#include <utility>
#include <vector>

// Range sum + point update. Node 1 is the root; node i has children 2i and 2i+1.
class SegmentTree {
public:
    long long visited = 0;

    explicit SegmentTree(const std::vector<int>& values)
        : n(static_cast<int>(values.size())), tree(4 * std::max(1, n), 0) { // 4n is always enough room
        if (n > 0) build(values, 1, 0, n - 1);
    }

    void update(int i, int value) { update(i, value, 1, 0, n - 1); }

    // Sum of values[l..r], both ends included.
    long long query(int l, int r) { return query(l, r, 1, 0, n - 1); }

    std::vector<std::vector<long long>> levels() const {
        std::vector<std::vector<long long>> out;
        std::vector<std::tuple<int, int, int>> row = {{1, 0, n - 1}};
        while (!row.empty()) {
            std::vector<long long> vals;
            std::vector<std::tuple<int, int, int>> next;
            for (auto [nd, lo, hi] : row) {
                vals.push_back(tree[nd]);
                if (lo < hi) {
                    int mid = lo + (hi - lo) / 2;
                    next.emplace_back(2 * nd, lo, mid);
                    next.emplace_back(2 * nd + 1, mid + 1, hi);
                }
            }
            out.push_back(vals);
            row = std::move(next);
        }
        return out;
    }

private:
    int n;
    std::vector<long long> tree; // long long: sums of many ints can overflow int

    void build(const std::vector<int>& a, int node, int lo, int hi) {
        if (lo == hi) {
            tree[node] = a[lo];
            return;
        }
        int mid = lo + (hi - lo) / 2;
        build(a, 2 * node, lo, mid);
        build(a, 2 * node + 1, mid + 1, hi);
        tree[node] = tree[2 * node] + tree[2 * node + 1];
    }

    void update(int i, int value, int node, int lo, int hi) {
        visited++;
        if (lo == hi) {
            tree[node] = value;
            return;
        }
        int mid = lo + (hi - lo) / 2;
        if (i <= mid) update(i, value, 2 * node, lo, mid);
        else update(i, value, 2 * node + 1, mid + 1, hi);
        tree[node] = tree[2 * node] + tree[2 * node + 1];
    }

    long long query(int l, int r, int node, int lo, int hi) {
        visited++;
        if (r < lo || hi < l) return 0;            // no overlap
        if (l <= lo && hi <= r) return tree[node]; // total overlap
        int mid = lo + (hi - lo) / 2;              // partial overlap
        return query(l, r, 2 * node, lo, mid) + query(l, r, 2 * node + 1, mid + 1, hi);
    }
};

std::string fmt(const std::vector<long long>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

long long seed = 12345;
int nxt() {
    seed = seed * 48271 % 2147483647LL;
    return static_cast<int>(seed);
}

int main() {
    SegmentTree st({2, 1, 5, 3, 4});
    auto lv = st.levels();
    for (size_t d = 0; d < lv.size(); d++) std::cout << "level " << d << ": " << fmt(lv[d]) << "\\n";
    std::cout << "sum(1, 3) = " << st.query(1, 3) << "\\n";
    st.update(2, 10);
    std::cout << "after a[2] = 10, sum(1, 3) = " << st.query(1, 3) << "\\n";
    std::cout << "sum(0, 4) = " << st.query(0, 4) << ", sum(4, 4) = " << st.query(4, 4) << "\\n";

    const int n = 2000;
    std::vector<int> a(n);
    for (int i = 0; i < n; i++) a[i] = nxt() % 1000;
    SegmentTree big(a);
    long long bruteSum = 0, treeSum = 0, cells = 0;
    for (int op = 0; op < 3000; op++) {
        if (nxt() % 2 == 0) {
            int i = nxt() % n;
            int v = nxt() % 1000;
            a[i] = v;
            big.update(i, v);
        } else {
            int l = nxt() % n;
            int r = nxt() % n;
            if (l > r) std::swap(l, r);
            for (int k = l; k <= r; k++) bruteSum += a[k];
            cells += r - l + 1;
            treeSum += big.query(l, r);
        }
    }
    std::cout << "n = 2000, 3000 random operations\\n";
    std::cout << "brute force:  checksum " << bruteSum << ", array cells read " << cells << "\\n";
    std::cout << "segment tree: checksum " << treeSum << ", tree nodes visited " << big.visited << "\\n";
}`,
          },
          {
            label: `Lazy propagation: range add + range min, vs brute force`,
            code: `#include <algorithm>
#include <climits>
#include <iostream>
#include <utility>
#include <vector>

// Range add + range min. lazy[node] = an add not yet pushed to the children.
class LazyMinTree {
public:
    long long visited = 0;

    explicit LazyMinTree(const std::vector<long long>& values)
        : n(static_cast<int>(values.size())), mn(4 * n, 0), lazy(4 * n, 0) {
        build(values, 1, 0, n - 1);
    }

    void add(int l, int r, long long delta) { add(l, r, delta, 1, 0, n - 1); }
    long long queryMin(int l, int r) { return queryMin(l, r, 1, 0, n - 1); }

private:
    int n;
    std::vector<long long> mn, lazy;

    void build(const std::vector<long long>& a, int node, int lo, int hi) {
        if (lo == hi) {
            mn[node] = a[lo];
            return;
        }
        int mid = lo + (hi - lo) / 2;
        build(a, 2 * node, lo, mid);
        build(a, 2 * node + 1, mid + 1, hi);
        mn[node] = std::min(mn[2 * node], mn[2 * node + 1]);
    }

    void push(int node) {
        if (lazy[node] != 0) {
            for (int child : {2 * node, 2 * node + 1}) {
                mn[child] += lazy[node];
                lazy[child] += lazy[node];
            }
            lazy[node] = 0;
        }
    }

    void add(int l, int r, long long delta, int node, int lo, int hi) {
        visited++;
        if (r < lo || hi < l) return;
        if (l <= lo && hi <= r) { // whole segment: tag it and stop here
            mn[node] += delta;
            lazy[node] += delta;
            return;
        }
        push(node);
        int mid = lo + (hi - lo) / 2;
        add(l, r, delta, 2 * node, lo, mid);
        add(l, r, delta, 2 * node + 1, mid + 1, hi);
        mn[node] = std::min(mn[2 * node], mn[2 * node + 1]);
    }

    long long queryMin(int l, int r, int node, int lo, int hi) {
        visited++;
        if (r < lo || hi < l) return LLONG_MAX;
        if (l <= lo && hi <= r) return mn[node];
        push(node);
        int mid = lo + (hi - lo) / 2;
        return std::min(queryMin(l, r, 2 * node, lo, mid), queryMin(l, r, 2 * node + 1, mid + 1, hi));
    }
};

long long seed = 99;
int nxt() {
    seed = seed * 48271 % 2147483647LL;
    return static_cast<int>(seed);
}

int main() {
    LazyMinTree t({5, 3, 8, 6, 1, 4});
    std::cout << "min(0, 3) = " << t.queryMin(0, 3) << "\\n";
    t.add(1, 4, 4);
    std::cout << "add 4 to [1, 4] -> min(0, 3) = " << t.queryMin(0, 3) << ", min(2, 5) = " << t.queryMin(2, 5) << "\\n";
    t.add(0, 0, -10);
    std::cout << "add -10 to [0, 0] -> min(0, 5) = " << t.queryMin(0, 5) << "\\n";

    const int n = 1000;
    std::vector<long long> a(n);
    for (int i = 0; i < n; i++) a[i] = nxt() % 1000;
    LazyMinTree big(a);
    long long written = 0;
    int matched = 0, queries = 0;
    for (int op = 0; op < 2000; op++) {
        int l = nxt() % n;
        int r = nxt() % n;
        if (l > r) std::swap(l, r);
        if (nxt() % 2 == 0) {
            int delta = nxt() % 21 - 10; // -10 .. 10
            for (int k = l; k <= r; k++) a[k] += delta;
            written += r - l + 1;
            big.add(l, r, delta);
        } else {
            queries++;
            long long brute = *std::min_element(a.begin() + l, a.begin() + r + 1);
            if (brute == big.queryMin(l, r)) matched++;
        }
    }
    std::cout << "n = 1000, 2000 random operations\\n";
    std::cout << "queries matched brute force: " << matched << " / " << queries << "\\n";
    std::cout << "brute force cells touched by range adds: " << written << "\\n";
    std::cout << "lazy tree nodes visited (adds and queries): " << big.visited << "\\n";
}`,
          },
        ],
      },
    },
  },
  {
    title: `Count of smaller numbers after self with Fenwick tree — how to coordinate compress?`,
    difficulty: "hard",
    seoDescription: `Count smaller numbers after self in O(n log n): coordinate-compress values to ranks, scan right to left with a Fenwick tree. Verified in four languages.`,
    languages: {
      python: {
        description: `**Question presented to candidate:**
"Given an integer array, return an array where \`counts[i]\` is the number of elements to the right of index i that are strictly smaller than \`nums[i]\`. Values can be negative and as large as a billion, and the array can have 100,000 elements. Solve it in Python with a Fenwick tree — and explain how you deal with the value range."

**What a strong answer should cover:**
- The O(n²) brute force first, and why n = 10^5 needs O(n log n).
- The right-to-left scan: the answer for i is a prefix count of values already seen, then add \`nums[i]\`.
- How a Fenwick tree does point add and prefix sum in O(log n) with \`i & -i\`, and why it is 1-indexed.
- Coordinate compression: sorted distinct values, 1-based ranks, equal values sharing a rank, and \`prefix(rank − 1)\` for strictly smaller.
- Alternatives: merge sort counting, a segment tree, a BST with subtree sizes.
- Python details: \`sorted(set(nums))\` and a dict comprehension for ranks (or \`bisect.bisect_left\`), a list of size m + 1, and no overflow concerns for totals.

**Clarifying questions expected:**
- What is the value range — can values be negative or very large?
- Do equal values count as smaller?
- How large can n be?

**Code / implementation expected:** Yes — compression plus a Fenwick tree in Python, O(n log n) time and O(n) space.`,
        answer: `**Target Audience:** Developers who know arrays, sorting and binary search and want the classic Fenwick tree problem.  
**Difficulty:** Hard  
**Language:** Python 3

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A line of children is waiting for a roller coaster. Each child looks at everyone **behind** them and wonders: *"How many of them are shorter than me?"* The child at the front has the most people to compare with; the child at the back has nobody, so their answer is 0.

The slow way is for every child to turn around and check every child behind them, one by one. With 100,000 children that is about five billion comparisons.

The fast way works from the **back of the line forwards**. Keep a tally board with one column per possible height. Walk from the last child to the first. For each child, first read the board: "how many children already on the board are shorter than this one?" — that is their answer, because everyone already on the board stands behind them. Then add this child to the board.

Two problems remain. Reading "how many are shorter" means adding up a whole stretch of columns, which is slow if done naively. And heights could be anything — negative numbers, a billion — so the board would need billions of columns. The **Fenwick tree** fixes the first problem (both "add one" and "count everything below h" in O(log n)); **coordinate compression** fixes the second (replace each value by its rank, so the board only needs as many columns as there are distinct values).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is the range of values? Can they be negative? | Values up to ±10^9 or negative rule out using the value directly as an array index; that is the reason for coordinate compression. |
| How should equal values count? | "Strictly smaller" means an equal value later in the array does not count, so we query ranks below \`rank − 1\`, not \`rank\`. |
| How large is n? | n up to 10^5 rules out the O(n²) double loop; we need O(n log n). |
| Return a new array, or fill one in place? | Affects only the API; the algorithm writes \`result[i]\` in the right-to-left scan either way. |
| Could the sum of all answers be needed? | That sum is the number of inversions and can reach n(n−1)/2 — about 5 × 10^9 for n = 10^5, which does not fit in a 32-bit integer. |

## 3. Brute Force First

For each index i, count the indexes j > i with \`nums[j] < nums[i]\`. Two nested loops: n(n−1)/2 comparisons, **O(n²)** time, O(1) extra space. It is the right first sentence in an interview and the reference for testing — example 2 runs it on 3,000 values and compares 4,498,500 pairs.

The sum of all the answers has a name: it is the number of **inversions** in the array, pairs (i, j) with i < j and \`nums[i] > nums[j]\`.

📌 **Interview term: Inversion** — a pair of positions i < j whose values are out of order (\`nums[i] > nums[j]\`). The answers to this problem, added up, are the inversion count.

## 4. The Key Idea: Right to Left with a Frequency Table

Walk from the **last** index to the first. Keep a table \`freq[v]\` = how many times value v has appeared **to the right** of the current position. Then:

1. \`answer[i] = freq[all values below nums[i]]\` — a **prefix sum** of the table;
2. \`freq[nums[i]] += 1\` — record this value for the positions further left.

📌 **Interview term: Frequency table** — an array where position v counts how often value v has been seen so far.

The algorithm needs two operations on that table, interleaved n times: *add 1 at one position* and *sum all positions below k*. A plain array makes the first O(1) and the second O(n); a precomputed [prefix sum](/interview-question/what-is-the-prefix-sum-technique) makes the second O(1) but the first O(n). We need both in O(log n), which is exactly what a Fenwick tree provides.

## 5. The Fenwick Tree (Binary Indexed Tree)

A Fenwick tree is an array \`tree[1..m]\` in which **cell i stores the sum of a block of positions that ends at i**. The block length is the **lowest set bit** of i: cell 6 (binary 110) has lowest bit 2, so it covers positions 5..6; cell 8 (1000) covers 1..8; every odd cell covers just itself.

📌 **Interview term: Fenwick tree (binary indexed tree, BIT)** — an array of partial sums where cell i covers the \`lowbit(i)\` positions ending at i, giving O(log n) point updates and prefix sums. It was introduced by Peter Fenwick in "A New Data Structure for Cumulative Frequency Tables" (*Software: Practice and Experience*, 1994).

📌 **Interview term: Lowest set bit (\`i & -i\`)** — the value of the rightmost 1 bit of i. In two's complement, \`-i\` flips every bit above the lowest 1, so \`i & -i\` keeps only that bit: \`12 & -12\` is 4 (binary 1100 → 100). More tricks like this are on the [bit manipulation tricks](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews) page.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 360" role="img" aria-label="Fenwick tree for ranks 1 to 8. Cell i covers the ranks from i minus its lowest set bit plus one up to i. Cell 8 covers 1 to 8, cell 4 covers 1 to 4, cells 2 and 6 cover two ranks, odd cells cover one">
  <rect class="d-box" x="54" y="255" width="67" height="40" rx="6"/>
  <text class="d-text" x="87" y="281" text-anchor="middle">t[1]: 1</text>
  <rect class="d-box" x="54" y="180" width="142" height="40" rx="6"/>
  <text class="d-text" x="125" y="206" text-anchor="middle">t[2]: 1..2</text>
  <rect class="d-box" x="204" y="255" width="67" height="40" rx="6"/>
  <text class="d-text" x="237" y="281" text-anchor="middle">t[3]: 3</text>
  <rect class="d-box-accent" x="54" y="105" width="292" height="40" rx="6"/>
  <text class="d-text" x="200" y="131" text-anchor="middle">t[4]: 1..4</text>
  <rect class="d-box" x="354" y="255" width="67" height="40" rx="6"/>
  <text class="d-text" x="387" y="281" text-anchor="middle">t[5]: 5</text>
  <rect class="d-box-accent" x="354" y="180" width="142" height="40" rx="6"/>
  <text class="d-text" x="425" y="206" text-anchor="middle">t[6]: 5..6</text>
  <rect class="d-box-accent" x="504" y="255" width="67" height="40" rx="6"/>
  <text class="d-text" x="537" y="281" text-anchor="middle">t[7]: 7</text>
  <rect class="d-box" x="54" y="30" width="592" height="40" rx="6"/>
  <text class="d-text" x="350" y="56" text-anchor="middle">t[8]: 1..8</text>
  <path class="d-edge" d="M 50 312 L 650 312"/>
  <text class="d-sub" x="87" y="340" text-anchor="middle">rank 1</text>
  <text class="d-sub" x="162" y="340" text-anchor="middle">rank 2</text>
  <text class="d-sub" x="237" y="340" text-anchor="middle">rank 3</text>
  <text class="d-sub" x="312" y="340" text-anchor="middle">rank 4</text>
  <text class="d-sub" x="387" y="340" text-anchor="middle">rank 5</text>
  <text class="d-sub" x="462" y="340" text-anchor="middle">rank 6</text>
  <text class="d-sub" x="537" y="340" text-anchor="middle">rank 7</text>
  <text class="d-sub" x="612" y="340" text-anchor="middle">rank 8</text>
</svg>

The highlighted cells are the ones a **prefix sum up to 7** reads: start at 7, add \`tree[7]\`, subtract the lowest bit (7 → 6), add \`tree[6]\`, subtract again (6 → 4), add \`tree[4]\`, then 4 → 0 stops. Three cells cover ranks 1..7 exactly once. An **add at position 3** goes the other way, *adding* the lowest bit each step: 3 → 4 → 8, updating every cell whose block contains 3.

Both loops change one bit per step, so each takes at most about log₂ m steps. Example 2 prints these paths for a real run ("add touches [1, 2, 4]").

## 6. Coordinate Compression

The frequency table is indexed by value, so values like −7 or 1,000,000,000 cannot be used directly. But the algorithm only ever asks "is this value smaller than that one?" — it never needs the actual numbers. So we can replace every value by its **rank** among the distinct values and nothing changes:

1. Make a sorted list of the **distinct** values.
2. The rank of a value is its position in that list, **starting at 1** (Fenwick trees are 1-indexed; index 0 is the "stop" value of the prefix loop).
3. Equal values get equal ranks.

📌 **Interview term: Coordinate compression** — mapping the values of an array to their ranks 1..m among the m distinct values, so that a structure indexed by value needs only m slots while every comparison keeps its result.

📌 **Interview term: Rank** — the 1-based position of a value in the sorted list of distinct values.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 300" role="img" aria-label="Coordinate compression of 1000000000, minus 7, 42, minus 7. The sorted distinct values are minus 7, 42 and 1000000000, so the ranks are 3, 1, 2, 1">
  <defs>
    <marker id="b18q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="54">values</text>
  <rect class="d-box" x="170" y="26" width="120" height="44" rx="6"/>
  <text class="d-text" x="230" y="54" text-anchor="middle">1000000000</text>
  <rect class="d-box" x="320" y="26" width="120" height="44" rx="6"/>
  <text class="d-text" x="380" y="54" text-anchor="middle">-7</text>
  <rect class="d-box" x="470" y="26" width="120" height="44" rx="6"/>
  <text class="d-text" x="530" y="54" text-anchor="middle">42</text>
  <rect class="d-box" x="620" y="26" width="120" height="44" rx="6"/>
  <text class="d-text" x="680" y="54" text-anchor="middle">-7</text>
  <path class="d-edge" d="M 455 74 L 455 110" marker-end="url(#b18q4-arrow)"/>
  <text class="d-sub" x="470" y="98">sort, drop duplicates</text>
  <text class="d-sub" x="20" y="146">sorted unique</text>
  <rect class="d-box-muted" x="170" y="118" width="120" height="44" rx="6"/>
  <text class="d-text" x="230" y="146" text-anchor="middle">-7  (rank 1)</text>
  <rect class="d-box-muted" x="320" y="118" width="120" height="44" rx="6"/>
  <text class="d-text" x="380" y="146" text-anchor="middle">42  (rank 2)</text>
  <rect class="d-box-muted" x="470" y="118" width="170" height="44" rx="6"/>
  <text class="d-text" x="555" y="146" text-anchor="middle">1000000000  (rank 3)</text>
  <path class="d-edge" d="M 455 166 L 455 202" marker-end="url(#b18q4-arrow)"/>
  <text class="d-sub" x="470" y="190">replace each value by its rank</text>
  <text class="d-sub" x="20" y="238">ranks</text>
  <rect class="d-box-accent" x="170" y="210" width="120" height="44" rx="6"/>
  <text class="d-text" x="230" y="238" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="320" y="210" width="120" height="44" rx="6"/>
  <text class="d-text" x="380" y="238" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="470" y="210" width="120" height="44" rx="6"/>
  <text class="d-text" x="530" y="238" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="620" y="210" width="120" height="44" rx="6"/>
  <text class="d-text" x="680" y="238" text-anchor="middle">1</text>
</svg>

After compression the ranks are \`[3, 1, 2, 1]\`, and the Fenwick tree needs only 3 cells instead of a billion. In example 2, 3,000 random values spread over almost 2 × 10^9 numbers compress to 2,211 ranks.

**Strictly smaller and duplicates.** With rank r for \`nums[i]\`, the answer is the prefix sum up to **r − 1**. An equal value later in the array has the same rank r and is therefore not counted. Using \`prefix(r)\` instead would count "smaller or equal" — a classic bug.

📌 **Interview term: Strict vs non-strict comparison** — "smaller" (<) excludes equal values, "smaller or equal" (≤) includes them. Here it decides between \`prefix(r − 1)\` and \`prefix(r)\`.

## 7. A Full Trace on \`[5, 2, 6, 1]\`

The sorted distinct values are \`[1, 2, 5, 6]\`, so the ranks are 5 → 3, 2 → 2, 6 → 4, 1 → 1. Walking right to left (this is example 2's output, in table form):

| i | value | rank r | answer = prefix(r − 1) | add(r) updates cells | tree after (cells 1..4) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 3 | 1 | 1 | prefix(0) = 0 | 1, 2, 4 | [1, 1, 0, 1] |
| 2 | 6 | 4 | prefix(3) = 1 | 4 | [1, 1, 0, 2] |
| 1 | 2 | 2 | prefix(1) = 1 | 2, 4 | [1, 2, 0, 3] |
| 0 | 5 | 3 | prefix(2) = 2 | 3, 4 | [1, 2, 1, 4] |

The answer is \`[2, 1, 1, 0]\`: 5 has two smaller values after it (2 and 1), 2 has one (1), 6 has one (1), and 1 has none.

## 8. The Code in Python

In Python, compression is two lines: \`sorted(set(nums))\` gives the distinct values in order, and a dict comprehension maps each value to its 1-based rank. The Fenwick tree is a plain list and two small nested functions. Python integers have no fixed width, so \`i & -i\` works exactly as in the math, and no total can overflow.

~~~python
def count_smaller(nums):
    # 1. Coordinate compression: value -> rank 1..m (equal values share a rank)
    sorted_unique = sorted(set(nums))
    rank = {v: i + 1 for i, v in enumerate(sorted_unique)}

    # 2. Fenwick tree (binary indexed tree) over ranks; tree[0] is unused
    m = len(sorted_unique)
    tree = [0] * (m + 1)

    def add(i):            # one more value with rank i has been seen
        while i <= m:
            tree[i] += 1
            i += i & -i    # jump to the next node that covers i

    def prefix(i):         # how many seen values have rank <= i
        total = 0
        while i > 0:
            total += tree[i]
            i -= i & -i    # drop the lowest set bit
        return total

    # 3. Walk right to left: everything already in the tree is to the right
    result = [0] * len(nums)
    for i in range(len(nums) - 1, -1, -1):
        r = rank[nums[i]]
        result[i] = prefix(r - 1)  # strictly smaller: ranks 1 .. r-1
        add(r)
    return result
~~~

**What to point out in this code:**

- \`tree = [0] * (m + 1)\`: index 0 is never used, because the prefix loop stops when \`i\` reaches 0.
- \`add\` climbs with \`i += i & -i\`; \`prefix\` descends with \`i -= i & -i\`. Mixing up the two signs is the most common Fenwick bug.
- \`prefix(r - 1)\` gives *strictly* smaller; equal values share a rank and are excluded.
- \`range(len(nums) - 1, -1, -1)\` walks right to left; \`reversed(range(len(nums)))\` says the same thing more readably.
- Instead of the rank dict you can use \`bisect.bisect_left(sorted_unique, x) + 1\`; the dict makes each lookup O(1) on average instead of O(log m).

## 9. Other Ways to Solve It

| Approach | Time | Notes |
| :--- | :--- | :--- |
| Brute force | O(n²) | Two loops; the reference for testing |
| Fenwick tree + coordinate compression | O(n log n) | This page; short code, small constants |
| [Segment tree](/interview-question/what-is-a-segment-tree-and-when-do-you-need-one) over ranks | O(n log n) | Same scan; more code. Choose it when you also need min/max or range updates |
| [Merge sort](/interview-question/how-do-merge-sort-and-quicksort-work) with index tracking | O(n log n) | While merging, every element taken from the right half is smaller than the remaining left ones; needs no compression |
| [Binary search tree](/interview-question/what-is-a-binary-search-tree-bst) with subtree sizes | O(n log n) balanced, O(n²) unbalanced | Insert right to left and count smaller keys on the way down — the same subtree-size idea as the [kth smallest element in a BST](/interview-question/how-do-you-find-the-kth-smallest-element-in-a-bst) |

## 10. Verified: Running the Code

Each example was saved as one file and run with \`python3 main.py\` (Python 3.13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. Example 2's 3,000 values come from a small deterministic generator (MINSTD) — values between −10^9 and 10^9, with about a quarter copied from earlier positions so there are plenty of duplicates.

**Example 1 — the solution on eight inputs (duplicates, negatives, empty, sorted, reversed)** prints:

~~~text
[2, 1, 1, 0]
[0]
[0, 0]
[]
[2, 0, 0]
[2, 0, 2, 0, 0]
[0, 0, 0, 0]
[3, 2, 1, 0]
~~~

\`[-1, -1]\` gives \`[0, 0]\` because equal is not smaller; \`[3, -2, 1000000000, -2, 7]\` shows large and negative values working after compression; a sorted array gives all zeros and a reversed one gives \`[3, 2, 1, 0]\`.

**Example 2 — the compression and Fenwick trace, then brute force vs Fenwick on 3,000 values** prints:

~~~text
sorted unique [1, 2, 5, 6], ranks [3, 2, 4, 1]
i=3 value 1 rank 1: smaller = prefix(0) = 0, add touches [1, 2, 4]
i=2 value 6 rank 4: smaller = prefix(3) = 1, add touches [4]
i=1 value 2 rank 2: smaller = prefix(1) = 1, add touches [2, 4]
i=0 value 5 rank 3: smaller = prefix(2) = 2, add touches [3, 4]
answer [2, 1, 1, 0], tree [1, 2, 1, 4]
n = 3000, distinct values 2211
value range needs 1997989092 slots; compressed tree needs 2212
brute force: total 2279820, pairs compared 4498500
fenwick:     total 2279820, tree cells touched 35273
~~~

The trace matches the table in section 7. In the large test, the values span 1,997,989,092 possible numbers but compress to 2,212 Fenwick cells (2,211 ranks plus the unused cell 0). Brute force and the Fenwick scan agree on the total (2,279,820 inversions), but brute force compared 4,498,500 pairs while the Fenwick tree touched 35,273 cells — about 12 per element.

## 11. Complexity

n = length of the array, m = number of distinct values (m ≤ n).

| Step | Time | Why |
| :--- | :--- | :--- |
| Coordinate compression | O(n log n) | sort the distinct values, then one lookup per element |
| Right-to-left scan | O(n log m) | one prefix query and one add per element, each about log₂ m steps |
| **Total** | **O(n log n)** | vs O(n²) for brute force |

| Space | Bound | Why |
| :--- | :--- | :--- |
| Sorted distinct values + rank lookup | O(m) | one entry per distinct value |
| Fenwick tree | O(m) | m + 1 cells |
| Result | O(n) | one count per element |

In Python, \`sorted(set(nums))\` is the O(n log n) step; the dict lookups are O(1) on average.

## 12. Edge Cases

- **Empty array** — m = 0, the loop does not run, the answer is \`[]\`.
- **One element** — the answer is \`[0]\`.
- **All equal** (\`[-1, -1]\`) — one rank; every \`prefix(r − 1)\` is \`prefix(0) = 0\`.
- **Sorted ascending** — all zeros; **sorted descending** — \`[n−1, …, 1, 0]\`, the maximum possible inversion count.
- **Huge or negative values** (\`1000000000\`, \`-2\`) — compression makes them harmless.
- **Large n with the total wanted** — n(n−1)/2 overflows 32-bit integers once n is above about 65,536.

## Common Pitfalls

- **\`prefix(r)\` instead of \`prefix(r - 1)\`.** Counts equal values too; \`[-1, -1]\` would give \`[1, 0]\`.
- **0-based ranks.** With rank 0, \`add(0)\` loops forever (\`0 & -0\` is 0, so \`i\` never grows). Ranks start at 1.
- **Scanning left to right.** Then the tree holds the values *before* i, which answers a different question ("smaller numbers before self").
- **Using the raw value as the index** "because Python lists can be big". \`[0] * 2_000_000_001\` is billions of slots; negatives would index from the end of the list silently.
- **\`nums.sort()\` for compression.** It sorts the input in place and returns \`None\`; use \`sorted(set(nums))\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Brute force:</strong> <span style="color:#f0e2c8;">Two loops over all pairs: O(n²). Say it first, then improve it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The scan:</strong> <span style="color:#f0e2c8;">Walk right to left with a frequency table of values already seen; the answer for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> is the count of seen values below <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code>, then add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The Fenwick tree:</strong> <span style="color:#f0e2c8;">Supports add-one and prefix-sum in O(log n) by jumping by the lowest set bit: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i += i &amp; -i</code> to add, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i -= i &amp; -i</code> to sum.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Compression:</strong> <span style="color:#f0e2c8;">Values can be negative or huge, so map them to 1-based ranks among the sorted distinct values. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix(rank - 1)</code> for strictly smaller. Total O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sorted(set(nums))</code> plus a dict for ranks; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tree = [0] * (m + 1)</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i &amp; -i</code> works on Python ints and nothing overflows.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do the ranks start at 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The prefix loop stops at index 0, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add(0)</code> would never move because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 &amp; -0</code> is 0. Index 0 is reserved as the stop value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do duplicates work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Equal values get the same rank, and we query <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix(r - 1)</code>, so an equal value later in the array is not counted. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-1, -1]</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 0]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you avoid compression?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if values are small non-negative integers, then use them (plus 1) as indexes. Otherwise a merge sort that counts while merging needs no compression.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">bisect</code> instead of the dict?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bisect.bisect_left(sorted_unique, x) + 1</code> is the rank. It is O(log m) per lookup instead of O(1) average, and it uses no extra dict.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if values arrive as a stream?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then you do not know all values in advance for compression; use a balanced structure keyed by value, or compress offline if the full input can be read first.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Inversion** | A pair i < j with nums[i] > nums[j]; the answers sum to the inversion count |
| **Frequency table** | Array where position v counts how often value v was seen |
| **Fenwick tree (binary indexed tree, BIT)** | Array of partial sums; cell i covers lowbit(i) positions ending at i |
| **Lowest set bit (\`i & -i\`)** | The rightmost 1 bit of i; the Fenwick jump size |
| **Coordinate compression** | Replace values by their ranks among the distinct values |
| **Rank** | 1-based position of a value in the sorted distinct values |
| **Strict vs non-strict comparison** | < excludes equal values, ≤ includes them; here prefix(r − 1) vs prefix(r) |

---
**Conclusion:** Count of smaller numbers after self is a right-to-left scan over a frequency table: each answer is "how many values seen so far are smaller", and then the current value is added. A Fenwick tree makes both steps O(log n) by jumping along the lowest set bit, and coordinate compression — \`sorted(set(nums))\` and a rank dict — shrinks any range of values, negative or huge, to 1..m. Query \`prefix(rank - 1)\` for strictly smaller, start ranks at 1, and the whole solution is O(n log n): on 3,000 values it touched 35,273 cells where brute force compared 4,498,500 pairs.`,
        examples: [
          {
            label: `Coordinate compression + Fenwick tree on eight inputs`,
            code: `def count_smaller(nums):
    # 1. Coordinate compression: value -> rank 1..m (equal values share a rank)
    sorted_unique = sorted(set(nums))
    rank = {v: i + 1 for i, v in enumerate(sorted_unique)}

    # 2. Fenwick tree (binary indexed tree) over ranks; tree[0] is unused
    m = len(sorted_unique)
    tree = [0] * (m + 1)

    def add(i):            # one more value with rank i has been seen
        while i <= m:
            tree[i] += 1
            i += i & -i    # jump to the next node that covers i

    def prefix(i):         # how many seen values have rank <= i
        total = 0
        while i > 0:
            total += tree[i]
            i -= i & -i    # drop the lowest set bit
        return total

    # 3. Walk right to left: everything already in the tree is to the right
    result = [0] * len(nums)
    for i in range(len(nums) - 1, -1, -1):
        r = rank[nums[i]]
        result[i] = prefix(r - 1)  # strictly smaller: ranks 1 .. r-1
        add(r)
    return result


def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


print(fmt(count_smaller([5, 2, 6, 1])))  # [2, 1, 1, 0]
print(fmt(count_smaller([-1])))  # [0]
print(fmt(count_smaller([-1, -1])))  # [0, 0]
print(fmt(count_smaller([])))  # []
print(fmt(count_smaller([2, 0, 1])))  # [2, 0, 0]
print(fmt(count_smaller([3, -2, 1000000000, -2, 7])))  # [2, 0, 2, 0, 0]
print(fmt(count_smaller([1, 2, 3, 4])))  # [0, 0, 0, 0]
print(fmt(count_smaller([4, 3, 2, 1])))  # [3, 2, 1, 0]`,
          },
          {
            label: `Fenwick trace on [5, 2, 6, 1], brute force vs Fenwick on 3,000 values`,
            code: `def fmt(xs):
    return "[" + ", ".join(str(x) for x in xs) + "]"


class Fenwick:
    def __init__(self, m):
        self.m = m
        self.tree = [0] * (m + 1)  # index 0 unused
        self.touched = 0

    def add(self, i):
        path = []
        while i <= self.m:
            self.tree[i] += 1
            path.append(i)
            self.touched += 1
            i += i & -i
        return path

    def prefix(self, i):
        total = 0
        while i > 0:
            total += self.tree[i]
            self.touched += 1
            i -= i & -i
        return total


def ranks_of(nums):
    sorted_unique = sorted(set(nums))
    rank = {v: i + 1 for i, v in enumerate(sorted_unique)}
    return sorted_unique, [rank[v] for v in nums]


# Part 1: trace [5, 2, 6, 1]
nums = [5, 2, 6, 1]
su, rk = ranks_of(nums)
print("sorted unique " + fmt(su) + ", ranks " + fmt(rk))
fw = Fenwick(len(su))
res = [0] * len(nums)
for i in range(len(nums) - 1, -1, -1):
    res[i] = fw.prefix(rk[i] - 1)
    path = fw.add(rk[i])
    print("i=" + str(i) + " value " + str(nums[i]) + " rank " + str(rk[i]) + ": smaller = prefix(" + str(rk[i] - 1) + ") = " + str(res[i]) + ", add touches " + fmt(path))
print("answer " + fmt(res) + ", tree " + fmt(fw.tree[1:]))

# Part 2: 3000 values in [-10^9, 10^9] with some duplicates, brute force vs Fenwick
seed = 2024
def nxt():
    global seed
    seed = seed * 48271 % 2147483647
    return seed

a = []
for i in range(3000):
    if i > 0 and nxt() % 4 == 0:
        a.append(a[nxt() % i])                       # copy an earlier value
    else:
        a.append(nxt() % 2000000001 - 1000000000)

pairs = brute_total = 0
for i in range(len(a)):
    for j in range(i + 1, len(a)):
        pairs += 1
        if a[j] < a[i]:
            brute_total += 1

su, rk = ranks_of(a)
fw = Fenwick(len(su))
fen_total = 0
for i in range(len(a) - 1, -1, -1):
    fen_total += fw.prefix(rk[i] - 1)
    fw.add(rk[i])

print("n = 3000, distinct values " + str(len(su)))
print("value range needs " + str(max(a) - min(a) + 1) + " slots; compressed tree needs " + str(len(su) + 1))
print("brute force: total " + str(brute_total) + ", pairs compared " + str(pairs))
print("fenwick:     total " + str(fen_total) + ", tree cells touched " + str(fw.touched))`,
          },
        ],
      },
      javascript: {
        description: `**Question presented to candidate:**
"Given an integer array, return an array where \`counts[i]\` is the number of elements to the right of index i that are strictly smaller than \`nums[i]\`. Values can be negative and as large as a billion, and the array can have 100,000 elements. Solve it in JavaScript with a Fenwick tree — and explain how you deal with the value range."

**What a strong answer should cover:**
- The O(n²) brute force first, and why n = 10^5 needs O(n log n).
- The right-to-left scan: the answer for i is a prefix count of values already seen, then add \`nums[i]\`.
- How a Fenwick tree does point add and prefix sum in O(log n) with \`i & -i\`, and why it is 1-indexed.
- Coordinate compression: sorted distinct values, 1-based ranks, equal values sharing a rank, and \`prefix(rank − 1)\` for strictly smaller.
- Alternatives: merge sort counting, a segment tree, a BST with subtree sizes.
- JavaScript details: the numeric comparator in \`sort((a, b) => a - b)\` (the default sorts as strings), a \`Map\` for ranks, \`fill(0)\` on the tree, and \`&\` working on 32-bit integers.

**Clarifying questions expected:**
- What is the value range — can values be negative or very large?
- Do equal values count as smaller?
- How large can n be?

**Code / implementation expected:** Yes — compression plus a Fenwick tree in JavaScript, O(n log n) time and O(n) space.`,
        answer: `**Target Audience:** Developers who know arrays, sorting and binary search and want the classic Fenwick tree problem.  
**Difficulty:** Hard  
**Language:** JavaScript (ES2020+)

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A line of children is waiting for a roller coaster. Each child looks at everyone **behind** them and wonders: *"How many of them are shorter than me?"* The child at the front has the most people to compare with; the child at the back has nobody, so their answer is 0.

The slow way is for every child to turn around and check every child behind them, one by one. With 100,000 children that is about five billion comparisons.

The fast way works from the **back of the line forwards**. Keep a tally board with one column per possible height. Walk from the last child to the first. For each child, first read the board: "how many children already on the board are shorter than this one?" — that is their answer, because everyone already on the board stands behind them. Then add this child to the board.

Two problems remain. Reading "how many are shorter" means adding up a whole stretch of columns, which is slow if done naively. And heights could be anything — negative numbers, a billion — so the board would need billions of columns. The **Fenwick tree** fixes the first problem (both "add one" and "count everything below h" in O(log n)); **coordinate compression** fixes the second (replace each value by its rank, so the board only needs as many columns as there are distinct values).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is the range of values? Can they be negative? | Values up to ±10^9 or negative rule out using the value directly as an array index; that is the reason for coordinate compression. |
| How should equal values count? | "Strictly smaller" means an equal value later in the array does not count, so we query ranks below \`rank − 1\`, not \`rank\`. |
| How large is n? | n up to 10^5 rules out the O(n²) double loop; we need O(n log n). |
| Return a new array, or fill one in place? | Affects only the API; the algorithm writes \`result[i]\` in the right-to-left scan either way. |
| Could the sum of all answers be needed? | That sum is the number of inversions and can reach n(n−1)/2 — about 5 × 10^9 for n = 10^5, which does not fit in a 32-bit integer. |

## 3. Brute Force First

For each index i, count the indexes j > i with \`nums[j] < nums[i]\`. Two nested loops: n(n−1)/2 comparisons, **O(n²)** time, O(1) extra space. It is the right first sentence in an interview and the reference for testing — example 2 runs it on 3,000 values and compares 4,498,500 pairs.

The sum of all the answers has a name: it is the number of **inversions** in the array, pairs (i, j) with i < j and \`nums[i] > nums[j]\`.

📌 **Interview term: Inversion** — a pair of positions i < j whose values are out of order (\`nums[i] > nums[j]\`). The answers to this problem, added up, are the inversion count.

## 4. The Key Idea: Right to Left with a Frequency Table

Walk from the **last** index to the first. Keep a table \`freq[v]\` = how many times value v has appeared **to the right** of the current position. Then:

1. \`answer[i] = freq[all values below nums[i]]\` — a **prefix sum** of the table;
2. \`freq[nums[i]] += 1\` — record this value for the positions further left.

📌 **Interview term: Frequency table** — an array where position v counts how often value v has been seen so far.

The algorithm needs two operations on that table, interleaved n times: *add 1 at one position* and *sum all positions below k*. A plain array makes the first O(1) and the second O(n); a precomputed [prefix sum](/interview-question/what-is-the-prefix-sum-technique) makes the second O(1) but the first O(n). We need both in O(log n), which is exactly what a Fenwick tree provides.

## 5. The Fenwick Tree (Binary Indexed Tree)

A Fenwick tree is an array \`tree[1..m]\` in which **cell i stores the sum of a block of positions that ends at i**. The block length is the **lowest set bit** of i: cell 6 (binary 110) has lowest bit 2, so it covers positions 5..6; cell 8 (1000) covers 1..8; every odd cell covers just itself.

📌 **Interview term: Fenwick tree (binary indexed tree, BIT)** — an array of partial sums where cell i covers the \`lowbit(i)\` positions ending at i, giving O(log n) point updates and prefix sums. It was introduced by Peter Fenwick in "A New Data Structure for Cumulative Frequency Tables" (*Software: Practice and Experience*, 1994).

📌 **Interview term: Lowest set bit (\`i & -i\`)** — the value of the rightmost 1 bit of i. In two's complement, \`-i\` flips every bit above the lowest 1, so \`i & -i\` keeps only that bit: \`12 & -12\` is 4 (binary 1100 → 100). More tricks like this are on the [bit manipulation tricks](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews) page.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 360" role="img" aria-label="Fenwick tree for ranks 1 to 8. Cell i covers the ranks from i minus its lowest set bit plus one up to i. Cell 8 covers 1 to 8, cell 4 covers 1 to 4, cells 2 and 6 cover two ranks, odd cells cover one">
  <rect class="d-box" x="54" y="255" width="67" height="40" rx="6"/>
  <text class="d-text" x="87" y="281" text-anchor="middle">t[1]: 1</text>
  <rect class="d-box" x="54" y="180" width="142" height="40" rx="6"/>
  <text class="d-text" x="125" y="206" text-anchor="middle">t[2]: 1..2</text>
  <rect class="d-box" x="204" y="255" width="67" height="40" rx="6"/>
  <text class="d-text" x="237" y="281" text-anchor="middle">t[3]: 3</text>
  <rect class="d-box-accent" x="54" y="105" width="292" height="40" rx="6"/>
  <text class="d-text" x="200" y="131" text-anchor="middle">t[4]: 1..4</text>
  <rect class="d-box" x="354" y="255" width="67" height="40" rx="6"/>
  <text class="d-text" x="387" y="281" text-anchor="middle">t[5]: 5</text>
  <rect class="d-box-accent" x="354" y="180" width="142" height="40" rx="6"/>
  <text class="d-text" x="425" y="206" text-anchor="middle">t[6]: 5..6</text>
  <rect class="d-box-accent" x="504" y="255" width="67" height="40" rx="6"/>
  <text class="d-text" x="537" y="281" text-anchor="middle">t[7]: 7</text>
  <rect class="d-box" x="54" y="30" width="592" height="40" rx="6"/>
  <text class="d-text" x="350" y="56" text-anchor="middle">t[8]: 1..8</text>
  <path class="d-edge" d="M 50 312 L 650 312"/>
  <text class="d-sub" x="87" y="340" text-anchor="middle">rank 1</text>
  <text class="d-sub" x="162" y="340" text-anchor="middle">rank 2</text>
  <text class="d-sub" x="237" y="340" text-anchor="middle">rank 3</text>
  <text class="d-sub" x="312" y="340" text-anchor="middle">rank 4</text>
  <text class="d-sub" x="387" y="340" text-anchor="middle">rank 5</text>
  <text class="d-sub" x="462" y="340" text-anchor="middle">rank 6</text>
  <text class="d-sub" x="537" y="340" text-anchor="middle">rank 7</text>
  <text class="d-sub" x="612" y="340" text-anchor="middle">rank 8</text>
</svg>

The highlighted cells are the ones a **prefix sum up to 7** reads: start at 7, add \`tree[7]\`, subtract the lowest bit (7 → 6), add \`tree[6]\`, subtract again (6 → 4), add \`tree[4]\`, then 4 → 0 stops. Three cells cover ranks 1..7 exactly once. An **add at position 3** goes the other way, *adding* the lowest bit each step: 3 → 4 → 8, updating every cell whose block contains 3.

Both loops change one bit per step, so each takes at most about log₂ m steps. Example 2 prints these paths for a real run ("add touches [1, 2, 4]").

## 6. Coordinate Compression

The frequency table is indexed by value, so values like −7 or 1,000,000,000 cannot be used directly. But the algorithm only ever asks "is this value smaller than that one?" — it never needs the actual numbers. So we can replace every value by its **rank** among the distinct values and nothing changes:

1. Make a sorted list of the **distinct** values.
2. The rank of a value is its position in that list, **starting at 1** (Fenwick trees are 1-indexed; index 0 is the "stop" value of the prefix loop).
3. Equal values get equal ranks.

📌 **Interview term: Coordinate compression** — mapping the values of an array to their ranks 1..m among the m distinct values, so that a structure indexed by value needs only m slots while every comparison keeps its result.

📌 **Interview term: Rank** — the 1-based position of a value in the sorted list of distinct values.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 300" role="img" aria-label="Coordinate compression of 1000000000, minus 7, 42, minus 7. The sorted distinct values are minus 7, 42 and 1000000000, so the ranks are 3, 1, 2, 1">
  <defs>
    <marker id="b18q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="54">values</text>
  <rect class="d-box" x="170" y="26" width="120" height="44" rx="6"/>
  <text class="d-text" x="230" y="54" text-anchor="middle">1000000000</text>
  <rect class="d-box" x="320" y="26" width="120" height="44" rx="6"/>
  <text class="d-text" x="380" y="54" text-anchor="middle">-7</text>
  <rect class="d-box" x="470" y="26" width="120" height="44" rx="6"/>
  <text class="d-text" x="530" y="54" text-anchor="middle">42</text>
  <rect class="d-box" x="620" y="26" width="120" height="44" rx="6"/>
  <text class="d-text" x="680" y="54" text-anchor="middle">-7</text>
  <path class="d-edge" d="M 455 74 L 455 110" marker-end="url(#b18q4-arrow)"/>
  <text class="d-sub" x="470" y="98">sort, drop duplicates</text>
  <text class="d-sub" x="20" y="146">sorted unique</text>
  <rect class="d-box-muted" x="170" y="118" width="120" height="44" rx="6"/>
  <text class="d-text" x="230" y="146" text-anchor="middle">-7  (rank 1)</text>
  <rect class="d-box-muted" x="320" y="118" width="120" height="44" rx="6"/>
  <text class="d-text" x="380" y="146" text-anchor="middle">42  (rank 2)</text>
  <rect class="d-box-muted" x="470" y="118" width="170" height="44" rx="6"/>
  <text class="d-text" x="555" y="146" text-anchor="middle">1000000000  (rank 3)</text>
  <path class="d-edge" d="M 455 166 L 455 202" marker-end="url(#b18q4-arrow)"/>
  <text class="d-sub" x="470" y="190">replace each value by its rank</text>
  <text class="d-sub" x="20" y="238">ranks</text>
  <rect class="d-box-accent" x="170" y="210" width="120" height="44" rx="6"/>
  <text class="d-text" x="230" y="238" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="320" y="210" width="120" height="44" rx="6"/>
  <text class="d-text" x="380" y="238" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="470" y="210" width="120" height="44" rx="6"/>
  <text class="d-text" x="530" y="238" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="620" y="210" width="120" height="44" rx="6"/>
  <text class="d-text" x="680" y="238" text-anchor="middle">1</text>
</svg>

After compression the ranks are \`[3, 1, 2, 1]\`, and the Fenwick tree needs only 3 cells instead of a billion. In example 2, 3,000 random values spread over almost 2 × 10^9 numbers compress to 2,211 ranks.

**Strictly smaller and duplicates.** With rank r for \`nums[i]\`, the answer is the prefix sum up to **r − 1**. An equal value later in the array has the same rank r and is therefore not counted. Using \`prefix(r)\` instead would count "smaller or equal" — a classic bug.

📌 **Interview term: Strict vs non-strict comparison** — "smaller" (<) excludes equal values, "smaller or equal" (≤) includes them. Here it decides between \`prefix(r − 1)\` and \`prefix(r)\`.

## 7. A Full Trace on \`[5, 2, 6, 1]\`

The sorted distinct values are \`[1, 2, 5, 6]\`, so the ranks are 5 → 3, 2 → 2, 6 → 4, 1 → 1. Walking right to left (this is example 2's output, in table form):

| i | value | rank r | answer = prefix(r − 1) | add(r) updates cells | tree after (cells 1..4) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 3 | 1 | 1 | prefix(0) = 0 | 1, 2, 4 | [1, 1, 0, 1] |
| 2 | 6 | 4 | prefix(3) = 1 | 4 | [1, 1, 0, 2] |
| 1 | 2 | 2 | prefix(1) = 1 | 2, 4 | [1, 2, 0, 3] |
| 0 | 5 | 3 | prefix(2) = 2 | 3, 4 | [1, 2, 1, 4] |

The answer is \`[2, 1, 1, 0]\`: 5 has two smaller values after it (2 and 1), 2 has one (1), 6 has one (1), and 1 has none.

## 8. The Code in JavaScript

In JavaScript, compression is \`[...new Set(nums)].sort((a, b) => a - b)\` followed by a \`Map\` from value to rank. The comparator is **required**: the default \`sort()\` converts numbers to strings, and we ran \`[10, 9, 1, -2, -10].sort()\` and got \`[-10,-2,1,10,9]\` — 10 before 9. \`i & -i\` works because bitwise operators act on 32-bit integers and every rank is far below 2^31.

~~~javascript
function countSmaller(nums) {
  // 1. Coordinate compression: value -> rank 1..m (equal values share a rank)
  const sortedUnique = [...new Set(nums)].sort((a, b) => a - b); // numeric compare!
  const rank = new Map();
  sortedUnique.forEach((v, i) => rank.set(v, i + 1));

  // 2. Fenwick tree (binary indexed tree) over ranks; tree[0] is unused
  const m = sortedUnique.length;
  const tree = new Array(m + 1).fill(0);
  const add = (i) => {      // one more value with rank i has been seen
    for (; i <= m; i += i & -i) tree[i]++;
  };
  const prefix = (i) => {   // how many seen values have rank <= i
    let total = 0;
    for (; i > 0; i -= i & -i) total += tree[i];
    return total;
  };

  // 3. Walk right to left: everything already in the tree is to the right
  const result = new Array(nums.length).fill(0);
  for (let i = nums.length - 1; i >= 0; i--) {
    const r = rank.get(nums[i]);
    result[i] = prefix(r - 1); // strictly smaller: ranks 1 .. r-1
    add(r);
  }
  return result;
}
~~~

**What to point out in this code:**

- \`new Array(m + 1).fill(0)\`: index 0 is never used, because the prefix loop stops at 0. Without \`fill(0)\`, \`tree[i]++\` on an empty slot gives \`NaN\`.
- \`add\` climbs with \`i += i & -i\`; \`prefix\` descends with \`i -= i & -i\`. Mixing up the two signs is the most common Fenwick bug.
- \`prefix(r - 1)\` gives *strictly* smaller; equal values share a rank and are excluded.
- A \`Map\` keyed by numbers is safe here. A plain object would turn keys into strings, which still works for integers but is a needless conversion.
- \`new Set(nums)\` uses SameValueZero equality, so \`0\` and \`-0\` are the same value — one rank — which is what the comparison \`<\` expects as well.

## 9. Other Ways to Solve It

| Approach | Time | Notes |
| :--- | :--- | :--- |
| Brute force | O(n²) | Two loops; the reference for testing |
| Fenwick tree + coordinate compression | O(n log n) | This page; short code, small constants |
| [Segment tree](/interview-question/what-is-a-segment-tree-and-when-do-you-need-one) over ranks | O(n log n) | Same scan; more code. Choose it when you also need min/max or range updates |
| [Merge sort](/interview-question/how-do-merge-sort-and-quicksort-work) with index tracking | O(n log n) | While merging, every element taken from the right half is smaller than the remaining left ones; needs no compression |
| [Binary search tree](/interview-question/what-is-a-binary-search-tree-bst) with subtree sizes | O(n log n) balanced, O(n²) unbalanced | Insert right to left and count smaller keys on the way down — the same subtree-size idea as the [kth smallest element in a BST](/interview-question/how-do-you-find-the-kth-smallest-element-in-a-bst) |

## 10. Verified: Running the Code

Each example was saved as one file and run with \`node main.js\` (Node.js 22; the same file runs unchanged in the page). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. Example 2's 3,000 values come from a small deterministic generator (MINSTD) — values between −10^9 and 10^9, with about a quarter copied from earlier positions so there are plenty of duplicates.

**Example 1 — the solution on eight inputs (duplicates, negatives, empty, sorted, reversed)** prints:

~~~text
[2, 1, 1, 0]
[0]
[0, 0]
[]
[2, 0, 0]
[2, 0, 2, 0, 0]
[0, 0, 0, 0]
[3, 2, 1, 0]
~~~

\`[-1, -1]\` gives \`[0, 0]\` because equal is not smaller; \`[3, -2, 1000000000, -2, 7]\` shows large and negative values working after compression; a sorted array gives all zeros and a reversed one gives \`[3, 2, 1, 0]\`.

**Example 2 — the compression and Fenwick trace, then brute force vs Fenwick on 3,000 values** prints:

~~~text
sorted unique [1, 2, 5, 6], ranks [3, 2, 4, 1]
i=3 value 1 rank 1: smaller = prefix(0) = 0, add touches [1, 2, 4]
i=2 value 6 rank 4: smaller = prefix(3) = 1, add touches [4]
i=1 value 2 rank 2: smaller = prefix(1) = 1, add touches [2, 4]
i=0 value 5 rank 3: smaller = prefix(2) = 2, add touches [3, 4]
answer [2, 1, 1, 0], tree [1, 2, 1, 4]
n = 3000, distinct values 2211
value range needs 1997989092 slots; compressed tree needs 2212
brute force: total 2279820, pairs compared 4498500
fenwick:     total 2279820, tree cells touched 35273
~~~

The trace matches the table in section 7. In the large test, the values span 1,997,989,092 possible numbers but compress to 2,212 Fenwick cells (2,211 ranks plus the unused cell 0). Brute force and the Fenwick scan agree on the total (2,279,820 inversions), but brute force compared 4,498,500 pairs while the Fenwick tree touched 35,273 cells — about 12 per element.

## 11. Complexity

n = length of the array, m = number of distinct values (m ≤ n).

| Step | Time | Why |
| :--- | :--- | :--- |
| Coordinate compression | O(n log n) | sort the distinct values, then one lookup per element |
| Right-to-left scan | O(n log m) | one prefix query and one add per element, each about log₂ m steps |
| **Total** | **O(n log n)** | vs O(n²) for brute force |

| Space | Bound | Why |
| :--- | :--- | :--- |
| Sorted distinct values + rank lookup | O(m) | one entry per distinct value |
| Fenwick tree | O(m) | m + 1 cells |
| Result | O(n) | one count per element |

In JavaScript, the \`sort\` with a comparator is the O(n log n) step; \`Map.get\` is O(1) on average.

## 12. Edge Cases

- **Empty array** — m = 0, the loop does not run, the answer is \`[]\`.
- **One element** — the answer is \`[0]\`.
- **All equal** (\`[-1, -1]\`) — one rank; every \`prefix(r − 1)\` is \`prefix(0) = 0\`.
- **Sorted ascending** — all zeros; **sorted descending** — \`[n−1, …, 1, 0]\`, the maximum possible inversion count.
- **Huge or negative values** (\`1000000000\`, \`-2\`) — compression makes them harmless.
- **Large n with the total wanted** — n(n−1)/2 overflows 32-bit integers once n is above about 65,536.

## Common Pitfalls

- **\`sort()\` without a comparator.** It sorts numbers as strings (\`[10, 9, 1].sort()\` gives \`[1, 10, 9]\`), so the ranks are wrong for multi-digit or negative values.
- **\`prefix(r)\` instead of \`prefix(r - 1)\`.** Counts equal values too; \`[-1, -1]\` would give \`[1, 0]\`.
- **0-based ranks.** With rank 0, \`add(0)\` loops forever (\`0 & -0\` is 0). Ranks start at 1.
- **Using the raw value as the index.** \`tree[-7]\` sets a string-keyed property on the array instead of an element, and a value of 10^9 makes a huge sparse array — wrong and slow without an error.
- **Bitwise tricks on large numbers.** \`&\` truncates to 32 bits; fine for ranks, wrong for the raw values themselves.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Brute force:</strong> <span style="color:#f0e2c8;">Two loops over all pairs: O(n²). Say it first, then improve it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The scan:</strong> <span style="color:#f0e2c8;">Walk right to left with a frequency table of values already seen; the answer for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> is the count of seen values below <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code>, then add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The Fenwick tree:</strong> <span style="color:#f0e2c8;">Supports add-one and prefix-sum in O(log n) by jumping by the lowest set bit: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i += i &amp; -i</code> to add, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i -= i &amp; -i</code> to sum.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Compression:</strong> <span style="color:#f0e2c8;">Values can be negative or huge, so map them to 1-based ranks among the sorted distinct values. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix(rank - 1)</code> for strictly smaller. Total O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. JavaScript detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[...new Set(nums)].sort((a, b) =&gt; a - b)</code> — never the default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort()</code> — plus a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code> for ranks and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fill(0)</code> on the tree.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why the comparator in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sort</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort()</code> compares as strings; our run of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[10, 9, 1, -2, -10].sort()</code> gave <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-10,-2,1,10,9]</code>. Ranks built from that order are wrong.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do duplicates work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Set</code> keeps one copy of each value, so equal values share a rank; querying <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix(r - 1)</code> excludes them. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[-1, -1]</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 0]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do the ranks start at 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The prefix loop stops at 0 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add(0)</code> never moves because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 &amp; -0</code> is 0.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">i &amp; -i</code> safe in JavaScript?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bitwise operators convert to 32-bit integers. Ranks are at most n, far below 2^31, so yes; never apply it to the raw values.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you avoid compression?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only for small non-negative integers. Otherwise a merge sort that counts during merges needs no compression and is also O(n log n).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Inversion** | A pair i < j with nums[i] > nums[j]; the answers sum to the inversion count |
| **Frequency table** | Array where position v counts how often value v was seen |
| **Fenwick tree (binary indexed tree, BIT)** | Array of partial sums; cell i covers lowbit(i) positions ending at i |
| **Lowest set bit (\`i & -i\`)** | The rightmost 1 bit of i; the Fenwick jump size |
| **Coordinate compression** | Replace values by their ranks among the distinct values |
| **Rank** | 1-based position of a value in the sorted distinct values |
| **Strict vs non-strict comparison** | < excludes equal values, ≤ includes them; here prefix(r − 1) vs prefix(r) |

---
**Conclusion:** Count of smaller numbers after self is a right-to-left scan over a frequency table: each answer is "how many values seen so far are smaller", and then the current value is added. A Fenwick tree makes both steps O(log n) by jumping along the lowest set bit, and coordinate compression — a \`Set\`, a numeric \`sort((a, b) => a - b)\` and a rank \`Map\` — shrinks any range of values to 1..m. Query \`prefix(rank - 1)\` for strictly smaller, start ranks at 1, never use the default \`sort()\`, and the solution is O(n log n): 35,273 cells touched against 4,498,500 brute-force comparisons on 3,000 values.`,
        examples: [
          {
            label: `Coordinate compression + Fenwick tree on eight inputs`,
            code: `function countSmaller(nums) {
  // 1. Coordinate compression: value -> rank 1..m (equal values share a rank)
  const sortedUnique = [...new Set(nums)].sort((a, b) => a - b); // numeric compare!
  const rank = new Map();
  sortedUnique.forEach((v, i) => rank.set(v, i + 1));

  // 2. Fenwick tree (binary indexed tree) over ranks; tree[0] is unused
  const m = sortedUnique.length;
  const tree = new Array(m + 1).fill(0);
  const add = (i) => {      // one more value with rank i has been seen
    for (; i <= m; i += i & -i) tree[i]++;
  };
  const prefix = (i) => {   // how many seen values have rank <= i
    let total = 0;
    for (; i > 0; i -= i & -i) total += tree[i];
    return total;
  };

  // 3. Walk right to left: everything already in the tree is to the right
  const result = new Array(nums.length).fill(0);
  for (let i = nums.length - 1; i >= 0; i--) {
    const r = rank.get(nums[i]);
    result[i] = prefix(r - 1); // strictly smaller: ranks 1 .. r-1
    add(r);
  }
  return result;
}

const fmt = (xs) => "[" + xs.join(", ") + "]";

console.log(fmt(countSmaller([5, 2, 6, 1]))); // [2, 1, 1, 0]
console.log(fmt(countSmaller([-1]))); // [0]
console.log(fmt(countSmaller([-1, -1]))); // [0, 0]
console.log(fmt(countSmaller([]))); // []
console.log(fmt(countSmaller([2, 0, 1]))); // [2, 0, 0]
console.log(fmt(countSmaller([3, -2, 1000000000, -2, 7]))); // [2, 0, 2, 0, 0]
console.log(fmt(countSmaller([1, 2, 3, 4]))); // [0, 0, 0, 0]
console.log(fmt(countSmaller([4, 3, 2, 1]))); // [3, 2, 1, 0]`,
          },
          {
            label: `Fenwick trace on [5, 2, 6, 1], brute force vs Fenwick on 3,000 values`,
            code: `const fmt = (xs) => "[" + xs.join(", ") + "]";

class Fenwick {
  constructor(m) {
    this.m = m;
    this.tree = new Array(m + 1).fill(0); // index 0 unused
    this.touched = 0;
  }
  add(i) {
    const path = [];
    for (; i <= this.m; i += i & -i) {
      this.tree[i]++;
      path.push(i);
      this.touched++;
    }
    return path;
  }
  prefix(i) {
    let total = 0;
    for (; i > 0; i -= i & -i) {
      total += this.tree[i];
      this.touched++;
    }
    return total;
  }
}

function ranksOf(nums) {
  const sortedUnique = [...new Set(nums)].sort((a, b) => a - b);
  const rank = new Map(sortedUnique.map((v, i) => [v, i + 1]));
  return [sortedUnique, nums.map((v) => rank.get(v))];
}

// Part 1: trace [5, 2, 6, 1]
let nums = [5, 2, 6, 1];
let [su, rk] = ranksOf(nums);
console.log("sorted unique " + fmt(su) + ", ranks " + fmt(rk));
let fw = new Fenwick(su.length);
const res = new Array(nums.length).fill(0);
for (let i = nums.length - 1; i >= 0; i--) {
  res[i] = fw.prefix(rk[i] - 1);
  const path = fw.add(rk[i]);
  console.log("i=" + i + " value " + nums[i] + " rank " + rk[i] + ": smaller = prefix(" + (rk[i] - 1) + ") = " + res[i] + ", add touches " + fmt(path));
}
console.log("answer " + fmt(res) + ", tree " + fmt(fw.tree.slice(1)));

// Part 2: 3000 values in [-10^9, 10^9] with some duplicates, brute force vs Fenwick
let seed = 2024;
const nxt = () => (seed = (seed * 48271) % 2147483647);
const a = [];
for (let i = 0; i < 3000; i++) {
  if (i > 0 && nxt() % 4 === 0) a.push(a[nxt() % i]); // copy an earlier value
  else a.push((nxt() % 2000000001) - 1000000000);
}

let pairs = 0, bruteTotal = 0;
for (let i = 0; i < a.length; i++) {
  for (let j = i + 1; j < a.length; j++) {
    pairs++;
    if (a[j] < a[i]) bruteTotal++;
  }
}

[su, rk] = ranksOf(a);
fw = new Fenwick(su.length);
let fenTotal = 0;
for (let i = a.length - 1; i >= 0; i--) {
  fenTotal += fw.prefix(rk[i] - 1);
  fw.add(rk[i]);
}

console.log("n = 3000, distinct values " + su.length);
console.log("value range needs " + (su[su.length - 1] - su[0] + 1) + " slots; compressed tree needs " + (su.length + 1));
console.log("brute force: total " + bruteTotal + ", pairs compared " + pairs);
console.log("fenwick:     total " + fenTotal + ", tree cells touched " + fw.touched);`,
          },
        ],
      },
      java: {
        description: `**Question presented to candidate:**
"Given an integer array, return an array where \`counts[i]\` is the number of elements to the right of index i that are strictly smaller than \`nums[i]\`. Values can be negative and as large as a billion, and the array can have 100,000 elements. Solve it in Java with a Fenwick tree — and explain how you deal with the value range."

**What a strong answer should cover:**
- The O(n²) brute force first, and why n = 10^5 needs O(n log n).
- The right-to-left scan: the answer for i is a prefix count of values already seen, then add \`nums[i]\`.
- How a Fenwick tree does point add and prefix sum in O(log n) with \`i & -i\`, and why it is 1-indexed.
- Coordinate compression: sorted distinct values, 1-based ranks, equal values sharing a rank, and \`prefix(rank − 1)\` for strictly smaller.
- Alternatives: merge sort counting, a segment tree, a BST with subtree sizes.
- Java details: sorting a \`clone()\` not the input, \`Arrays.binarySearch\` on the deduplicated prefix, and \`long\` for totals because n(n−1)/2 overflows \`int\`.

**Clarifying questions expected:**
- What is the value range — can values be negative or very large?
- Do equal values count as smaller?
- How large can n be?

**Code / implementation expected:** Yes — compression plus a Fenwick tree in Java, O(n log n) time and O(n) space.`,
        answer: `**Target Audience:** Developers who know arrays, sorting and binary search and want the classic Fenwick tree problem.  
**Difficulty:** Hard  
**Language:** Java 17+

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A line of children is waiting for a roller coaster. Each child looks at everyone **behind** them and wonders: *"How many of them are shorter than me?"* The child at the front has the most people to compare with; the child at the back has nobody, so their answer is 0.

The slow way is for every child to turn around and check every child behind them, one by one. With 100,000 children that is about five billion comparisons.

The fast way works from the **back of the line forwards**. Keep a tally board with one column per possible height. Walk from the last child to the first. For each child, first read the board: "how many children already on the board are shorter than this one?" — that is their answer, because everyone already on the board stands behind them. Then add this child to the board.

Two problems remain. Reading "how many are shorter" means adding up a whole stretch of columns, which is slow if done naively. And heights could be anything — negative numbers, a billion — so the board would need billions of columns. The **Fenwick tree** fixes the first problem (both "add one" and "count everything below h" in O(log n)); **coordinate compression** fixes the second (replace each value by its rank, so the board only needs as many columns as there are distinct values).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is the range of values? Can they be negative? | Values up to ±10^9 or negative rule out using the value directly as an array index; that is the reason for coordinate compression. |
| How should equal values count? | "Strictly smaller" means an equal value later in the array does not count, so we query ranks below \`rank − 1\`, not \`rank\`. |
| How large is n? | n up to 10^5 rules out the O(n²) double loop; we need O(n log n). |
| Return a new array, or fill one in place? | Affects only the API; the algorithm writes \`result[i]\` in the right-to-left scan either way. |
| Could the sum of all answers be needed? | That sum is the number of inversions and can reach n(n−1)/2 — about 5 × 10^9 for n = 10^5, which does not fit in a 32-bit integer. |

## 3. Brute Force First

For each index i, count the indexes j > i with \`nums[j] < nums[i]\`. Two nested loops: n(n−1)/2 comparisons, **O(n²)** time, O(1) extra space. It is the right first sentence in an interview and the reference for testing — example 2 runs it on 3,000 values and compares 4,498,500 pairs.

The sum of all the answers has a name: it is the number of **inversions** in the array, pairs (i, j) with i < j and \`nums[i] > nums[j]\`.

📌 **Interview term: Inversion** — a pair of positions i < j whose values are out of order (\`nums[i] > nums[j]\`). The answers to this problem, added up, are the inversion count.

## 4. The Key Idea: Right to Left with a Frequency Table

Walk from the **last** index to the first. Keep a table \`freq[v]\` = how many times value v has appeared **to the right** of the current position. Then:

1. \`answer[i] = freq[all values below nums[i]]\` — a **prefix sum** of the table;
2. \`freq[nums[i]] += 1\` — record this value for the positions further left.

📌 **Interview term: Frequency table** — an array where position v counts how often value v has been seen so far.

The algorithm needs two operations on that table, interleaved n times: *add 1 at one position* and *sum all positions below k*. A plain array makes the first O(1) and the second O(n); a precomputed [prefix sum](/interview-question/what-is-the-prefix-sum-technique) makes the second O(1) but the first O(n). We need both in O(log n), which is exactly what a Fenwick tree provides.

## 5. The Fenwick Tree (Binary Indexed Tree)

A Fenwick tree is an array \`tree[1..m]\` in which **cell i stores the sum of a block of positions that ends at i**. The block length is the **lowest set bit** of i: cell 6 (binary 110) has lowest bit 2, so it covers positions 5..6; cell 8 (1000) covers 1..8; every odd cell covers just itself.

📌 **Interview term: Fenwick tree (binary indexed tree, BIT)** — an array of partial sums where cell i covers the \`lowbit(i)\` positions ending at i, giving O(log n) point updates and prefix sums. It was introduced by Peter Fenwick in "A New Data Structure for Cumulative Frequency Tables" (*Software: Practice and Experience*, 1994).

📌 **Interview term: Lowest set bit (\`i & -i\`)** — the value of the rightmost 1 bit of i. In two's complement, \`-i\` flips every bit above the lowest 1, so \`i & -i\` keeps only that bit: \`12 & -12\` is 4 (binary 1100 → 100). More tricks like this are on the [bit manipulation tricks](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews) page.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 360" role="img" aria-label="Fenwick tree for ranks 1 to 8. Cell i covers the ranks from i minus its lowest set bit plus one up to i. Cell 8 covers 1 to 8, cell 4 covers 1 to 4, cells 2 and 6 cover two ranks, odd cells cover one">
  <rect class="d-box" x="54" y="255" width="67" height="40" rx="6"/>
  <text class="d-text" x="87" y="281" text-anchor="middle">t[1]: 1</text>
  <rect class="d-box" x="54" y="180" width="142" height="40" rx="6"/>
  <text class="d-text" x="125" y="206" text-anchor="middle">t[2]: 1..2</text>
  <rect class="d-box" x="204" y="255" width="67" height="40" rx="6"/>
  <text class="d-text" x="237" y="281" text-anchor="middle">t[3]: 3</text>
  <rect class="d-box-accent" x="54" y="105" width="292" height="40" rx="6"/>
  <text class="d-text" x="200" y="131" text-anchor="middle">t[4]: 1..4</text>
  <rect class="d-box" x="354" y="255" width="67" height="40" rx="6"/>
  <text class="d-text" x="387" y="281" text-anchor="middle">t[5]: 5</text>
  <rect class="d-box-accent" x="354" y="180" width="142" height="40" rx="6"/>
  <text class="d-text" x="425" y="206" text-anchor="middle">t[6]: 5..6</text>
  <rect class="d-box-accent" x="504" y="255" width="67" height="40" rx="6"/>
  <text class="d-text" x="537" y="281" text-anchor="middle">t[7]: 7</text>
  <rect class="d-box" x="54" y="30" width="592" height="40" rx="6"/>
  <text class="d-text" x="350" y="56" text-anchor="middle">t[8]: 1..8</text>
  <path class="d-edge" d="M 50 312 L 650 312"/>
  <text class="d-sub" x="87" y="340" text-anchor="middle">rank 1</text>
  <text class="d-sub" x="162" y="340" text-anchor="middle">rank 2</text>
  <text class="d-sub" x="237" y="340" text-anchor="middle">rank 3</text>
  <text class="d-sub" x="312" y="340" text-anchor="middle">rank 4</text>
  <text class="d-sub" x="387" y="340" text-anchor="middle">rank 5</text>
  <text class="d-sub" x="462" y="340" text-anchor="middle">rank 6</text>
  <text class="d-sub" x="537" y="340" text-anchor="middle">rank 7</text>
  <text class="d-sub" x="612" y="340" text-anchor="middle">rank 8</text>
</svg>

The highlighted cells are the ones a **prefix sum up to 7** reads: start at 7, add \`tree[7]\`, subtract the lowest bit (7 → 6), add \`tree[6]\`, subtract again (6 → 4), add \`tree[4]\`, then 4 → 0 stops. Three cells cover ranks 1..7 exactly once. An **add at position 3** goes the other way, *adding* the lowest bit each step: 3 → 4 → 8, updating every cell whose block contains 3.

Both loops change one bit per step, so each takes at most about log₂ m steps. Example 2 prints these paths for a real run ("add touches [1, 2, 4]").

## 6. Coordinate Compression

The frequency table is indexed by value, so values like −7 or 1,000,000,000 cannot be used directly. But the algorithm only ever asks "is this value smaller than that one?" — it never needs the actual numbers. So we can replace every value by its **rank** among the distinct values and nothing changes:

1. Make a sorted list of the **distinct** values.
2. The rank of a value is its position in that list, **starting at 1** (Fenwick trees are 1-indexed; index 0 is the "stop" value of the prefix loop).
3. Equal values get equal ranks.

📌 **Interview term: Coordinate compression** — mapping the values of an array to their ranks 1..m among the m distinct values, so that a structure indexed by value needs only m slots while every comparison keeps its result.

📌 **Interview term: Rank** — the 1-based position of a value in the sorted list of distinct values.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 300" role="img" aria-label="Coordinate compression of 1000000000, minus 7, 42, minus 7. The sorted distinct values are minus 7, 42 and 1000000000, so the ranks are 3, 1, 2, 1">
  <defs>
    <marker id="b18q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="54">values</text>
  <rect class="d-box" x="170" y="26" width="120" height="44" rx="6"/>
  <text class="d-text" x="230" y="54" text-anchor="middle">1000000000</text>
  <rect class="d-box" x="320" y="26" width="120" height="44" rx="6"/>
  <text class="d-text" x="380" y="54" text-anchor="middle">-7</text>
  <rect class="d-box" x="470" y="26" width="120" height="44" rx="6"/>
  <text class="d-text" x="530" y="54" text-anchor="middle">42</text>
  <rect class="d-box" x="620" y="26" width="120" height="44" rx="6"/>
  <text class="d-text" x="680" y="54" text-anchor="middle">-7</text>
  <path class="d-edge" d="M 455 74 L 455 110" marker-end="url(#b18q4-arrow)"/>
  <text class="d-sub" x="470" y="98">sort, drop duplicates</text>
  <text class="d-sub" x="20" y="146">sorted unique</text>
  <rect class="d-box-muted" x="170" y="118" width="120" height="44" rx="6"/>
  <text class="d-text" x="230" y="146" text-anchor="middle">-7  (rank 1)</text>
  <rect class="d-box-muted" x="320" y="118" width="120" height="44" rx="6"/>
  <text class="d-text" x="380" y="146" text-anchor="middle">42  (rank 2)</text>
  <rect class="d-box-muted" x="470" y="118" width="170" height="44" rx="6"/>
  <text class="d-text" x="555" y="146" text-anchor="middle">1000000000  (rank 3)</text>
  <path class="d-edge" d="M 455 166 L 455 202" marker-end="url(#b18q4-arrow)"/>
  <text class="d-sub" x="470" y="190">replace each value by its rank</text>
  <text class="d-sub" x="20" y="238">ranks</text>
  <rect class="d-box-accent" x="170" y="210" width="120" height="44" rx="6"/>
  <text class="d-text" x="230" y="238" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="320" y="210" width="120" height="44" rx="6"/>
  <text class="d-text" x="380" y="238" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="470" y="210" width="120" height="44" rx="6"/>
  <text class="d-text" x="530" y="238" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="620" y="210" width="120" height="44" rx="6"/>
  <text class="d-text" x="680" y="238" text-anchor="middle">1</text>
</svg>

After compression the ranks are \`[3, 1, 2, 1]\`, and the Fenwick tree needs only 3 cells instead of a billion. In example 2, 3,000 random values spread over almost 2 × 10^9 numbers compress to 2,211 ranks.

**Strictly smaller and duplicates.** With rank r for \`nums[i]\`, the answer is the prefix sum up to **r − 1**. An equal value later in the array has the same rank r and is therefore not counted. Using \`prefix(r)\` instead would count "smaller or equal" — a classic bug.

📌 **Interview term: Strict vs non-strict comparison** — "smaller" (<) excludes equal values, "smaller or equal" (≤) includes them. Here it decides between \`prefix(r − 1)\` and \`prefix(r)\`.

## 7. A Full Trace on \`[5, 2, 6, 1]\`

The sorted distinct values are \`[1, 2, 5, 6]\`, so the ranks are 5 → 3, 2 → 2, 6 → 4, 1 → 1. Walking right to left (this is example 2's output, in table form):

| i | value | rank r | answer = prefix(r − 1) | add(r) updates cells | tree after (cells 1..4) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 3 | 1 | 1 | prefix(0) = 0 | 1, 2, 4 | [1, 1, 0, 1] |
| 2 | 6 | 4 | prefix(3) = 1 | 4 | [1, 1, 0, 2] |
| 1 | 2 | 2 | prefix(1) = 1 | 2, 4 | [1, 2, 0, 3] |
| 0 | 5 | 3 | prefix(2) = 2 | 3, 4 | [1, 2, 1, 4] |

The answer is \`[2, 1, 1, 0]\`: 5 has two smaller values after it (2 and 1), 2 has one (1), 6 has one (1), and 1 has none.

## 8. The Code in Java

In Java, compression sorts a **copy** of the input (\`nums.clone()\`, then \`Arrays.sort\`), removes duplicates in place, and finds each rank with \`Arrays.binarySearch(sorted, 0, m, x) + 1\`. \`binarySearch\` returns the index when the value is present — it always is here — and a negative number when it is not (searching 3 in \`[1, 2, 5, 6]\` returned −3 in our run), so only use it on values you know are in the list.

~~~java
static int[] countSmaller(int[] nums) {
    // 1. Coordinate compression: sort a copy, drop duplicates
    int[] sorted = nums.clone();
    Arrays.sort(sorted);
    int m = 0;
    for (int i = 0; i < sorted.length; i++) {
        if (i == 0 || sorted[i] != sorted[i - 1]) sorted[m++] = sorted[i];
    }

    // 2. Fenwick tree (binary indexed tree) over ranks 1..m; tree[0] is unused
    int[] tree = new int[m + 1];
    int[] result = new int[nums.length];

    // 3. Walk right to left: everything already in the tree is to the right
    for (int i = nums.length - 1; i >= 0; i--) {
        int r = Arrays.binarySearch(sorted, 0, m, nums[i]) + 1; // rank 1..m
        int total = 0;
        for (int j = r - 1; j > 0; j -= j & -j) total += tree[j]; // ranks 1 .. r-1
        result[i] = total;
        for (int j = r; j <= m; j += j & -j) tree[j]++;
    }
    return result;
}
~~~

**What to point out in this code:**

- \`new int[m + 1]\`: index 0 is never used, because the prefix loop stops at 0. Java zero-fills new arrays.
- The two loops are the Fenwick tree inlined: \`j -= j & -j\` for the prefix sum, \`j += j & -j\` for the add.
- \`nums.clone()\` matters: \`Arrays.sort(nums)\` would sort the caller's array and destroy the order the algorithm walks.
- Summing only cells for ranks 1 .. r − 1 (the first loop starts at \`r - 1\`) gives *strictly* smaller; equal values share rank r and are excluded.
- Each answer is at most n − 1, so \`int\` is fine for \`result\`; the **sum** of answers is not (see the pitfalls).

## 9. Other Ways to Solve It

| Approach | Time | Notes |
| :--- | :--- | :--- |
| Brute force | O(n²) | Two loops; the reference for testing |
| Fenwick tree + coordinate compression | O(n log n) | This page; short code, small constants |
| [Segment tree](/interview-question/what-is-a-segment-tree-and-when-do-you-need-one) over ranks | O(n log n) | Same scan; more code. Choose it when you also need min/max or range updates |
| [Merge sort](/interview-question/how-do-merge-sort-and-quicksort-work) with index tracking | O(n log n) | While merging, every element taken from the right half is smaller than the remaining left ones; needs no compression |
| [Binary search tree](/interview-question/what-is-a-binary-search-tree-bst) with subtree sizes | O(n log n) balanced, O(n²) unbalanced | Insert right to left and count smaller keys on the way down — the same subtree-size idea as the [kth smallest element in a BST](/interview-question/how-do-you-find-the-kth-smallest-element-in-a-bst) |

## 10. Verified: Running the Code

Each example was saved as one file and run with \`javac Main.java && java Main\` (JDK 21, compiled as Java 17+ source). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. Example 2's 3,000 values come from a small deterministic generator (MINSTD) — values between −10^9 and 10^9, with about a quarter copied from earlier positions so there are plenty of duplicates.

**Example 1 — the solution on eight inputs (duplicates, negatives, empty, sorted, reversed)** prints:

~~~text
[2, 1, 1, 0]
[0]
[0, 0]
[]
[2, 0, 0]
[2, 0, 2, 0, 0]
[0, 0, 0, 0]
[3, 2, 1, 0]
~~~

\`[-1, -1]\` gives \`[0, 0]\` because equal is not smaller; \`[3, -2, 1000000000, -2, 7]\` shows large and negative values working after compression; a sorted array gives all zeros and a reversed one gives \`[3, 2, 1, 0]\`.

**Example 2 — the compression and Fenwick trace, then brute force vs Fenwick on 3,000 values** prints:

~~~text
sorted unique [1, 2, 5, 6], ranks [3, 2, 4, 1]
i=3 value 1 rank 1: smaller = prefix(0) = 0, add touches [1, 2, 4]
i=2 value 6 rank 4: smaller = prefix(3) = 1, add touches [4]
i=1 value 2 rank 2: smaller = prefix(1) = 1, add touches [2, 4]
i=0 value 5 rank 3: smaller = prefix(2) = 2, add touches [3, 4]
answer [2, 1, 1, 0], tree [1, 2, 1, 4]
n = 3000, distinct values 2211
value range needs 1997989092 slots; compressed tree needs 2212
brute force: total 2279820, pairs compared 4498500
fenwick:     total 2279820, tree cells touched 35273
~~~

The trace matches the table in section 7. In the large test, the values span 1,997,989,092 possible numbers but compress to 2,212 Fenwick cells (2,211 ranks plus the unused cell 0). Brute force and the Fenwick scan agree on the total (2,279,820 inversions), but brute force compared 4,498,500 pairs while the Fenwick tree touched 35,273 cells — about 12 per element.

## 11. Complexity

n = length of the array, m = number of distinct values (m ≤ n).

| Step | Time | Why |
| :--- | :--- | :--- |
| Coordinate compression | O(n log n) | sort the distinct values, then one lookup per element |
| Right-to-left scan | O(n log m) | one prefix query and one add per element, each about log₂ m steps |
| **Total** | **O(n log n)** | vs O(n²) for brute force |

| Space | Bound | Why |
| :--- | :--- | :--- |
| Sorted distinct values + rank lookup | O(m) | one entry per distinct value |
| Fenwick tree | O(m) | m + 1 cells |
| Result | O(n) | one count per element |

In Java, \`Arrays.sort\` on an \`int[]\` is the O(n log n) step and each \`Arrays.binarySearch\` is O(log m).

## 12. Edge Cases

- **Empty array** — m = 0, the loop does not run, the answer is \`[]\`.
- **One element** — the answer is \`[0]\`.
- **All equal** (\`[-1, -1]\`) — one rank; every \`prefix(r − 1)\` is \`prefix(0) = 0\`.
- **Sorted ascending** — all zeros; **sorted descending** — \`[n−1, …, 1, 0]\`, the maximum possible inversion count.
- **Huge or negative values** (\`1000000000\`, \`-2\`) — compression makes them harmless.
- **Large n with the total wanted** — n(n−1)/2 overflows 32-bit integers once n is above about 65,536.

## Common Pitfalls

- **\`int\` for the total.** For n = 100,000, \`n * (n - 1) / 2\` in \`int\` printed 704982704 in our run instead of 4999950000. Use \`long\` for sums of answers.
- **\`prefix(r)\` instead of \`prefix(r - 1)\`.** Counts equal values too; \`[-1, -1]\` would give \`[1, 0]\`.
- **0-based ranks.** With rank 0, the add loop \`j += j & -j\` never moves (\`0 & -0\` is 0). Ranks start at 1.
- **\`Arrays.sort(nums)\` on the input** instead of a copy — the original order is lost.
- **\`max - min\` in \`int\`** when values can span the whole \`int\` range: \`Integer.MAX_VALUE - Integer.MIN_VALUE\` printed −1 in our run. Cast to \`long\` first, as example 2 does.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Brute force:</strong> <span style="color:#f0e2c8;">Two loops over all pairs: O(n²). Say it first, then improve it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The scan:</strong> <span style="color:#f0e2c8;">Walk right to left with a frequency table of values already seen; the answer for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> is the count of seen values below <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code>, then add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The Fenwick tree:</strong> <span style="color:#f0e2c8;">Supports add-one and prefix-sum in O(log n) by jumping by the lowest set bit: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i += i &amp; -i</code> to add, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i -= i &amp; -i</code> to sum.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Compression:</strong> <span style="color:#f0e2c8;">Values can be negative or huge, so map them to 1-based ranks among the sorted distinct values. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix(rank - 1)</code> for strictly smaller. Total O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Java detail:</strong> <span style="color:#f0e2c8;">Sort a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clone()</code>, dedupe, rank with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Arrays.binarySearch + 1</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long</code> for any total, because n(n−1)/2 overflows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> past n ≈ 65,536.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Arrays.binarySearch(sorted, 0, m, x)</code> with bounds?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">After the in-place dedupe only the first <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m</code> cells hold distinct values; the tail still holds leftovers. The bounded overload searches just the valid part.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do duplicates work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Equal values share a rank and we query <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix(r - 1)</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{-1, -1}</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 0]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long</code> anywhere?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each answer fits in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, but the total of answers is up to n(n−1)/2: for n = 100,000, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> arithmetic printed 704982704 instead of 4999950000.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do the ranks start at 1?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The prefix loop stops at 0 and the add loop never moves from 0, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 &amp; -0</code> is 0.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">A <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">TreeMap</code> instead of compression?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TreeMap</code> can map values to ranks, but counting smaller keys on it needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">headMap(x).size()</code>, which is O(size) — so it does not give O(log n) counts by itself.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Inversion** | A pair i < j with nums[i] > nums[j]; the answers sum to the inversion count |
| **Frequency table** | Array where position v counts how often value v was seen |
| **Fenwick tree (binary indexed tree, BIT)** | Array of partial sums; cell i covers lowbit(i) positions ending at i |
| **Lowest set bit (\`i & -i\`)** | The rightmost 1 bit of i; the Fenwick jump size |
| **Coordinate compression** | Replace values by their ranks among the distinct values |
| **Rank** | 1-based position of a value in the sorted distinct values |
| **Strict vs non-strict comparison** | < excludes equal values, ≤ includes them; here prefix(r − 1) vs prefix(r) |

---
**Conclusion:** Count of smaller numbers after self is a right-to-left scan over a frequency table: each answer is "how many values seen so far are smaller", and then the current value is added. A Fenwick tree makes both steps O(log n) by jumping along the lowest set bit, and coordinate compression — sort a \`clone()\`, dedupe, \`Arrays.binarySearch + 1\` — shrinks any range of values to 1..m. Query \`prefix(rank - 1)\` for strictly smaller, start ranks at 1, keep any total in a \`long\`, and the solution is O(n log n): 35,273 cells touched against 4,498,500 brute-force comparisons on 3,000 values.`,
        examples: [
          {
            label: `Coordinate compression + Fenwick tree on eight inputs`,
            code: `import java.util.Arrays;
import java.util.StringJoiner;

public class Main {
    static int[] countSmaller(int[] nums) {
        // 1. Coordinate compression: sort a copy, drop duplicates
        int[] sorted = nums.clone();
        Arrays.sort(sorted);
        int m = 0;
        for (int i = 0; i < sorted.length; i++) {
            if (i == 0 || sorted[i] != sorted[i - 1]) sorted[m++] = sorted[i];
        }

        // 2. Fenwick tree (binary indexed tree) over ranks 1..m; tree[0] is unused
        int[] tree = new int[m + 1];
        int[] result = new int[nums.length];

        // 3. Walk right to left: everything already in the tree is to the right
        for (int i = nums.length - 1; i >= 0; i--) {
            int r = Arrays.binarySearch(sorted, 0, m, nums[i]) + 1; // rank 1..m
            int total = 0;
            for (int j = r - 1; j > 0; j -= j & -j) total += tree[j]; // ranks 1 .. r-1
            result[i] = total;
            for (int j = r; j <= m; j += j & -j) tree[j]++;
        }
        return result;
    }

    static String fmt(int[] xs) {
        StringJoiner sj = new StringJoiner(", ", "[", "]");
        for (int x : xs) sj.add(String.valueOf(x));
        return sj.toString();
    }

    public static void main(String[] args) {
        System.out.println(fmt(countSmaller(new int[]{5, 2, 6, 1})));                 // [2, 1, 1, 0]
        System.out.println(fmt(countSmaller(new int[]{-1})));                         // [0]
        System.out.println(fmt(countSmaller(new int[]{-1, -1})));                     // [0, 0]
        System.out.println(fmt(countSmaller(new int[]{})));                           // []
        System.out.println(fmt(countSmaller(new int[]{2, 0, 1})));                    // [2, 0, 0]
        System.out.println(fmt(countSmaller(new int[]{3, -2, 1000000000, -2, 7})));   // [2, 0, 2, 0, 0]
        System.out.println(fmt(countSmaller(new int[]{1, 2, 3, 4})));                 // [0, 0, 0, 0]
        System.out.println(fmt(countSmaller(new int[]{4, 3, 2, 1})));                 // [3, 2, 1, 0]
    }
}`,
          },
          {
            label: `Fenwick trace on [5, 2, 6, 1], brute force vs Fenwick on 3,000 values`,
            code: `import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.StringJoiner;

public class Main {
    static class Fenwick {
        final int m;
        final int[] tree; // index 0 unused
        long touched = 0;

        Fenwick(int m) {
            this.m = m;
            tree = new int[m + 1];
        }

        List<Integer> add(int i) {
            List<Integer> path = new ArrayList<>();
            for (; i <= m; i += i & -i) {
                tree[i]++;
                path.add(i);
                touched++;
            }
            return path;
        }

        int prefix(int i) {
            int total = 0;
            for (; i > 0; i -= i & -i) {
                total += tree[i];
                touched++;
            }
            return total;
        }
    }

    /** Sorted distinct values; ranks are binarySearch index + 1. */
    static int[] sortedUnique(int[] nums) {
        return Arrays.stream(nums).distinct().sorted().toArray();
    }

    static String fmt(int[] xs) {
        StringJoiner sj = new StringJoiner(", ", "[", "]");
        for (int x : xs) sj.add(String.valueOf(x));
        return sj.toString();
    }

    static long seed = 2024;
    static int nxt() {
        seed = seed * 48271 % 2147483647L;
        return (int) seed;
    }

    public static void main(String[] args) {
        // Part 1: trace [5, 2, 6, 1]
        int[] nums = {5, 2, 6, 1};
        int[] su = sortedUnique(nums);
        int[] rk = new int[nums.length];
        for (int i = 0; i < nums.length; i++) rk[i] = Arrays.binarySearch(su, nums[i]) + 1;
        System.out.println("sorted unique " + fmt(su) + ", ranks " + fmt(rk));
        Fenwick fw = new Fenwick(su.length);
        int[] res = new int[nums.length];
        for (int i = nums.length - 1; i >= 0; i--) {
            res[i] = fw.prefix(rk[i] - 1);
            List<Integer> path = fw.add(rk[i]);
            System.out.println("i=" + i + " value " + nums[i] + " rank " + rk[i] + ": smaller = prefix(" + (rk[i] - 1)
                    + ") = " + res[i] + ", add touches " + path);
        }
        System.out.println("answer " + fmt(res) + ", tree " + fmt(Arrays.copyOfRange(fw.tree, 1, fw.tree.length)));

        // Part 2: 3000 values in [-10^9, 10^9] with some duplicates, brute force vs Fenwick
        int n = 3000;
        int[] a = new int[n];
        for (int i = 0; i < n; i++) {
            if (i > 0 && nxt() % 4 == 0) a[i] = a[nxt() % i]; // copy an earlier value
            else a[i] = nxt() % 2000000001 - 1000000000;
        }

        long pairs = 0, bruteTotal = 0;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                pairs++;
                if (a[j] < a[i]) bruteTotal++;
            }
        }

        su = sortedUnique(a);
        fw = new Fenwick(su.length);
        long fenTotal = 0; // long: up to n(n-1)/2, which overflows int once n passes about 65,536
        for (int i = n - 1; i >= 0; i--) {
            int r = Arrays.binarySearch(su, a[i]) + 1;
            fenTotal += fw.prefix(r - 1);
            fw.add(r);
        }

        long range = (long) su[su.length - 1] - su[0] + 1; // long: max - min overflows int when values span the whole int range
        System.out.println("n = 3000, distinct values " + su.length);
        System.out.println("value range needs " + range + " slots; compressed tree needs " + (su.length + 1));
        System.out.println("brute force: total " + bruteTotal + ", pairs compared " + pairs);
        System.out.println("fenwick:     total " + fenTotal + ", tree cells touched " + fw.touched);
    }
}`,
          },
        ],
      },
      cpp: {
        description: `**Question presented to candidate:**
"Given an integer array, return an array where \`counts[i]\` is the number of elements to the right of index i that are strictly smaller than \`nums[i]\`. Values can be negative and as large as a billion, and the array can have 100,000 elements. Solve it in C++ with a Fenwick tree — and explain how you deal with the value range."

**What a strong answer should cover:**
- The O(n²) brute force first, and why n = 10^5 needs O(n log n).
- The right-to-left scan: the answer for i is a prefix count of values already seen, then add \`nums[i]\`.
- How a Fenwick tree does point add and prefix sum in O(log n) with \`i & -i\`, and why it is 1-indexed.
- Coordinate compression: sorted distinct values, 1-based ranks, equal values sharing a rank, and \`prefix(rank − 1)\` for strictly smaller.
- Alternatives: merge sort counting, a segment tree, a BST with subtree sizes.
- C++ details: \`sort\` + \`unique\` + \`erase\`, \`lower_bound + 1\` for the rank, a signed loop index counting down, and \`long long\` for totals because signed overflow is undefined.

**Clarifying questions expected:**
- What is the value range — can values be negative or very large?
- Do equal values count as smaller?
- How large can n be?

**Code / implementation expected:** Yes — compression plus a Fenwick tree in C++, O(n log n) time and O(n) space.`,
        answer: `**Target Audience:** Developers who know arrays, sorting and binary search and want the classic Fenwick tree problem.  
**Difficulty:** Hard  
**Language:** C++17

> **How to read this doc:** every idea is explained in plain words first. When a word appears that an interviewer will expect you to know, it is tagged \`📌 Interview term:\` with a one-line definition, and every tagged term is collected in the Quick Glossary at the end. Every program on this page was actually run, and the output you see in the **Verified** section is copied from that run.

## 1. Why This Even Matters — A Story First

A line of children is waiting for a roller coaster. Each child looks at everyone **behind** them and wonders: *"How many of them are shorter than me?"* The child at the front has the most people to compare with; the child at the back has nobody, so their answer is 0.

The slow way is for every child to turn around and check every child behind them, one by one. With 100,000 children that is about five billion comparisons.

The fast way works from the **back of the line forwards**. Keep a tally board with one column per possible height. Walk from the last child to the first. For each child, first read the board: "how many children already on the board are shorter than this one?" — that is their answer, because everyone already on the board stands behind them. Then add this child to the board.

Two problems remain. Reading "how many are shorter" means adding up a whole stretch of columns, which is slow if done naively. And heights could be anything — negative numbers, a billion — so the board would need billions of columns. The **Fenwick tree** fixes the first problem (both "add one" and "count everything below h" in O(log n)); **coordinate compression** fixes the second (replace each value by its rank, so the board only needs as many columns as there are distinct values).

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is the range of values? Can they be negative? | Values up to ±10^9 or negative rule out using the value directly as an array index; that is the reason for coordinate compression. |
| How should equal values count? | "Strictly smaller" means an equal value later in the array does not count, so we query ranks below \`rank − 1\`, not \`rank\`. |
| How large is n? | n up to 10^5 rules out the O(n²) double loop; we need O(n log n). |
| Return a new array, or fill one in place? | Affects only the API; the algorithm writes \`result[i]\` in the right-to-left scan either way. |
| Could the sum of all answers be needed? | That sum is the number of inversions and can reach n(n−1)/2 — about 5 × 10^9 for n = 10^5, which does not fit in a 32-bit integer. |

## 3. Brute Force First

For each index i, count the indexes j > i with \`nums[j] < nums[i]\`. Two nested loops: n(n−1)/2 comparisons, **O(n²)** time, O(1) extra space. It is the right first sentence in an interview and the reference for testing — example 2 runs it on 3,000 values and compares 4,498,500 pairs.

The sum of all the answers has a name: it is the number of **inversions** in the array, pairs (i, j) with i < j and \`nums[i] > nums[j]\`.

📌 **Interview term: Inversion** — a pair of positions i < j whose values are out of order (\`nums[i] > nums[j]\`). The answers to this problem, added up, are the inversion count.

## 4. The Key Idea: Right to Left with a Frequency Table

Walk from the **last** index to the first. Keep a table \`freq[v]\` = how many times value v has appeared **to the right** of the current position. Then:

1. \`answer[i] = freq[all values below nums[i]]\` — a **prefix sum** of the table;
2. \`freq[nums[i]] += 1\` — record this value for the positions further left.

📌 **Interview term: Frequency table** — an array where position v counts how often value v has been seen so far.

The algorithm needs two operations on that table, interleaved n times: *add 1 at one position* and *sum all positions below k*. A plain array makes the first O(1) and the second O(n); a precomputed [prefix sum](/interview-question/what-is-the-prefix-sum-technique) makes the second O(1) but the first O(n). We need both in O(log n), which is exactly what a Fenwick tree provides.

## 5. The Fenwick Tree (Binary Indexed Tree)

A Fenwick tree is an array \`tree[1..m]\` in which **cell i stores the sum of a block of positions that ends at i**. The block length is the **lowest set bit** of i: cell 6 (binary 110) has lowest bit 2, so it covers positions 5..6; cell 8 (1000) covers 1..8; every odd cell covers just itself.

📌 **Interview term: Fenwick tree (binary indexed tree, BIT)** — an array of partial sums where cell i covers the \`lowbit(i)\` positions ending at i, giving O(log n) point updates and prefix sums. It was introduced by Peter Fenwick in "A New Data Structure for Cumulative Frequency Tables" (*Software: Practice and Experience*, 1994).

📌 **Interview term: Lowest set bit (\`i & -i\`)** — the value of the rightmost 1 bit of i. In two's complement, \`-i\` flips every bit above the lowest 1, so \`i & -i\` keeps only that bit: \`12 & -12\` is 4 (binary 1100 → 100). More tricks like this are on the [bit manipulation tricks](/interview-question/what-are-the-most-useful-bit-manipulation-tricks-for-interviews) page.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 360" role="img" aria-label="Fenwick tree for ranks 1 to 8. Cell i covers the ranks from i minus its lowest set bit plus one up to i. Cell 8 covers 1 to 8, cell 4 covers 1 to 4, cells 2 and 6 cover two ranks, odd cells cover one">
  <rect class="d-box" x="54" y="255" width="67" height="40" rx="6"/>
  <text class="d-text" x="87" y="281" text-anchor="middle">t[1]: 1</text>
  <rect class="d-box" x="54" y="180" width="142" height="40" rx="6"/>
  <text class="d-text" x="125" y="206" text-anchor="middle">t[2]: 1..2</text>
  <rect class="d-box" x="204" y="255" width="67" height="40" rx="6"/>
  <text class="d-text" x="237" y="281" text-anchor="middle">t[3]: 3</text>
  <rect class="d-box-accent" x="54" y="105" width="292" height="40" rx="6"/>
  <text class="d-text" x="200" y="131" text-anchor="middle">t[4]: 1..4</text>
  <rect class="d-box" x="354" y="255" width="67" height="40" rx="6"/>
  <text class="d-text" x="387" y="281" text-anchor="middle">t[5]: 5</text>
  <rect class="d-box-accent" x="354" y="180" width="142" height="40" rx="6"/>
  <text class="d-text" x="425" y="206" text-anchor="middle">t[6]: 5..6</text>
  <rect class="d-box-accent" x="504" y="255" width="67" height="40" rx="6"/>
  <text class="d-text" x="537" y="281" text-anchor="middle">t[7]: 7</text>
  <rect class="d-box" x="54" y="30" width="592" height="40" rx="6"/>
  <text class="d-text" x="350" y="56" text-anchor="middle">t[8]: 1..8</text>
  <path class="d-edge" d="M 50 312 L 650 312"/>
  <text class="d-sub" x="87" y="340" text-anchor="middle">rank 1</text>
  <text class="d-sub" x="162" y="340" text-anchor="middle">rank 2</text>
  <text class="d-sub" x="237" y="340" text-anchor="middle">rank 3</text>
  <text class="d-sub" x="312" y="340" text-anchor="middle">rank 4</text>
  <text class="d-sub" x="387" y="340" text-anchor="middle">rank 5</text>
  <text class="d-sub" x="462" y="340" text-anchor="middle">rank 6</text>
  <text class="d-sub" x="537" y="340" text-anchor="middle">rank 7</text>
  <text class="d-sub" x="612" y="340" text-anchor="middle">rank 8</text>
</svg>

The highlighted cells are the ones a **prefix sum up to 7** reads: start at 7, add \`tree[7]\`, subtract the lowest bit (7 → 6), add \`tree[6]\`, subtract again (6 → 4), add \`tree[4]\`, then 4 → 0 stops. Three cells cover ranks 1..7 exactly once. An **add at position 3** goes the other way, *adding* the lowest bit each step: 3 → 4 → 8, updating every cell whose block contains 3.

Both loops change one bit per step, so each takes at most about log₂ m steps. Example 2 prints these paths for a real run ("add touches [1, 2, 4]").

## 6. Coordinate Compression

The frequency table is indexed by value, so values like −7 or 1,000,000,000 cannot be used directly. But the algorithm only ever asks "is this value smaller than that one?" — it never needs the actual numbers. So we can replace every value by its **rank** among the distinct values and nothing changes:

1. Make a sorted list of the **distinct** values.
2. The rank of a value is its position in that list, **starting at 1** (Fenwick trees are 1-indexed; index 0 is the "stop" value of the prefix loop).
3. Equal values get equal ranks.

📌 **Interview term: Coordinate compression** — mapping the values of an array to their ranks 1..m among the m distinct values, so that a structure indexed by value needs only m slots while every comparison keeps its result.

📌 **Interview term: Rank** — the 1-based position of a value in the sorted list of distinct values.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 300" role="img" aria-label="Coordinate compression of 1000000000, minus 7, 42, minus 7. The sorted distinct values are minus 7, 42 and 1000000000, so the ranks are 3, 1, 2, 1">
  <defs>
    <marker id="b18q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="20" y="54">values</text>
  <rect class="d-box" x="170" y="26" width="120" height="44" rx="6"/>
  <text class="d-text" x="230" y="54" text-anchor="middle">1000000000</text>
  <rect class="d-box" x="320" y="26" width="120" height="44" rx="6"/>
  <text class="d-text" x="380" y="54" text-anchor="middle">-7</text>
  <rect class="d-box" x="470" y="26" width="120" height="44" rx="6"/>
  <text class="d-text" x="530" y="54" text-anchor="middle">42</text>
  <rect class="d-box" x="620" y="26" width="120" height="44" rx="6"/>
  <text class="d-text" x="680" y="54" text-anchor="middle">-7</text>
  <path class="d-edge" d="M 455 74 L 455 110" marker-end="url(#b18q4-arrow)"/>
  <text class="d-sub" x="470" y="98">sort, drop duplicates</text>
  <text class="d-sub" x="20" y="146">sorted unique</text>
  <rect class="d-box-muted" x="170" y="118" width="120" height="44" rx="6"/>
  <text class="d-text" x="230" y="146" text-anchor="middle">-7  (rank 1)</text>
  <rect class="d-box-muted" x="320" y="118" width="120" height="44" rx="6"/>
  <text class="d-text" x="380" y="146" text-anchor="middle">42  (rank 2)</text>
  <rect class="d-box-muted" x="470" y="118" width="170" height="44" rx="6"/>
  <text class="d-text" x="555" y="146" text-anchor="middle">1000000000  (rank 3)</text>
  <path class="d-edge" d="M 455 166 L 455 202" marker-end="url(#b18q4-arrow)"/>
  <text class="d-sub" x="470" y="190">replace each value by its rank</text>
  <text class="d-sub" x="20" y="238">ranks</text>
  <rect class="d-box-accent" x="170" y="210" width="120" height="44" rx="6"/>
  <text class="d-text" x="230" y="238" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="320" y="210" width="120" height="44" rx="6"/>
  <text class="d-text" x="380" y="238" text-anchor="middle">1</text>
  <rect class="d-box-accent" x="470" y="210" width="120" height="44" rx="6"/>
  <text class="d-text" x="530" y="238" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="620" y="210" width="120" height="44" rx="6"/>
  <text class="d-text" x="680" y="238" text-anchor="middle">1</text>
</svg>

After compression the ranks are \`[3, 1, 2, 1]\`, and the Fenwick tree needs only 3 cells instead of a billion. In example 2, 3,000 random values spread over almost 2 × 10^9 numbers compress to 2,211 ranks.

**Strictly smaller and duplicates.** With rank r for \`nums[i]\`, the answer is the prefix sum up to **r − 1**. An equal value later in the array has the same rank r and is therefore not counted. Using \`prefix(r)\` instead would count "smaller or equal" — a classic bug.

📌 **Interview term: Strict vs non-strict comparison** — "smaller" (<) excludes equal values, "smaller or equal" (≤) includes them. Here it decides between \`prefix(r − 1)\` and \`prefix(r)\`.

## 7. A Full Trace on \`[5, 2, 6, 1]\`

The sorted distinct values are \`[1, 2, 5, 6]\`, so the ranks are 5 → 3, 2 → 2, 6 → 4, 1 → 1. Walking right to left (this is example 2's output, in table form):

| i | value | rank r | answer = prefix(r − 1) | add(r) updates cells | tree after (cells 1..4) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 3 | 1 | 1 | prefix(0) = 0 | 1, 2, 4 | [1, 1, 0, 1] |
| 2 | 6 | 4 | prefix(3) = 1 | 4 | [1, 1, 0, 2] |
| 1 | 2 | 2 | prefix(1) = 1 | 2, 4 | [1, 2, 0, 3] |
| 0 | 5 | 3 | prefix(2) = 2 | 3, 4 | [1, 2, 1, 4] |

The answer is \`[2, 1, 1, 0]\`: 5 has two smaller values after it (2 and 1), 2 has one (1), 6 has one (1), and 1 has none.

## 8. The Code in C++

In C++, compression is the classic idiom \`std::sort\` + \`std::unique\` + \`erase\`, and each rank is \`std::lower_bound(...) - sorted.begin() + 1\`. \`std::unique\` only removes **adjacent** duplicates (on the unsorted \`{3, 1, 3, 2, 1}\` it removed nothing in our run), so it must come after the sort. \`lower_bound\` is a [binary search](/interview-question/how-does-binary-search-work-and-what-are-its-requirements) returning the first position not less than the value.

~~~cpp
std::vector<int> countSmaller(const std::vector<int>& nums) {
    // 1. Coordinate compression: sort a copy, then erase the duplicates
    std::vector<int> sorted = nums;
    std::sort(sorted.begin(), sorted.end());
    sorted.erase(std::unique(sorted.begin(), sorted.end()), sorted.end());
    const int m = static_cast<int>(sorted.size());

    // 2. Fenwick tree (binary indexed tree) over ranks 1..m; tree[0] is unused
    std::vector<int> tree(m + 1, 0);
    std::vector<int> result(nums.size(), 0);

    // 3. Walk right to left: everything already in the tree is to the right
    for (int i = static_cast<int>(nums.size()) - 1; i >= 0; i--) {
        int r = static_cast<int>(std::lower_bound(sorted.begin(), sorted.end(), nums[i]) - sorted.begin()) + 1;
        int total = 0;
        for (int j = r - 1; j > 0; j -= j & -j) total += tree[j]; // ranks 1 .. r-1
        result[i] = total;
        for (int j = r; j <= m; j += j & -j) tree[j]++;
    }
    return result;
}
~~~

**What to point out in this code:**

- \`std::vector<int> tree(m + 1, 0)\`: index 0 is never used, because the prefix loop stops at 0.
- The two loops are the Fenwick tree inlined: \`j -= j & -j\` for the prefix sum, \`j += j & -j\` for the add.
- \`std::vector<int> sorted = nums;\` copies the input, so sorting it leaves the caller's vector intact (\`nums\` is a \`const&\`).
- The loop index is a signed \`int\` counting down to 0. With \`size_t i\`, the test \`i >= 0\` is always true and the loop never ends.
- The first loop starts at \`r - 1\`, so only ranks 1 .. r − 1 are summed: *strictly* smaller, with equal values (same rank r) excluded.

## 9. Other Ways to Solve It

| Approach | Time | Notes |
| :--- | :--- | :--- |
| Brute force | O(n²) | Two loops; the reference for testing |
| Fenwick tree + coordinate compression | O(n log n) | This page; short code, small constants |
| [Segment tree](/interview-question/what-is-a-segment-tree-and-when-do-you-need-one) over ranks | O(n log n) | Same scan; more code. Choose it when you also need min/max or range updates |
| [Merge sort](/interview-question/how-do-merge-sort-and-quicksort-work) with index tracking | O(n log n) | While merging, every element taken from the right half is smaller than the remaining left ones; needs no compression |
| [Binary search tree](/interview-question/what-is-a-binary-search-tree-bst) with subtree sizes | O(n log n) balanced, O(n²) unbalanced | Insert right to left and count smaller keys on the way down — the same subtree-size idea as the [kth smallest element in a BST](/interview-question/how-do-you-find-the-kth-smallest-element-in-a-bst) |

## 10. Verified: Running the Code

Each example was saved as one file and run with \`g++ -std=c++17 main.cpp && ./a.out\` (GCC 13). The same programs were written in Python, JavaScript, Java and C++, and all four printed exactly the same lines. Example 2's 3,000 values come from a small deterministic generator (MINSTD) — values between −10^9 and 10^9, with about a quarter copied from earlier positions so there are plenty of duplicates.

**Example 1 — the solution on eight inputs (duplicates, negatives, empty, sorted, reversed)** prints:

~~~text
[2, 1, 1, 0]
[0]
[0, 0]
[]
[2, 0, 0]
[2, 0, 2, 0, 0]
[0, 0, 0, 0]
[3, 2, 1, 0]
~~~

\`[-1, -1]\` gives \`[0, 0]\` because equal is not smaller; \`[3, -2, 1000000000, -2, 7]\` shows large and negative values working after compression; a sorted array gives all zeros and a reversed one gives \`[3, 2, 1, 0]\`.

**Example 2 — the compression and Fenwick trace, then brute force vs Fenwick on 3,000 values** prints:

~~~text
sorted unique [1, 2, 5, 6], ranks [3, 2, 4, 1]
i=3 value 1 rank 1: smaller = prefix(0) = 0, add touches [1, 2, 4]
i=2 value 6 rank 4: smaller = prefix(3) = 1, add touches [4]
i=1 value 2 rank 2: smaller = prefix(1) = 1, add touches [2, 4]
i=0 value 5 rank 3: smaller = prefix(2) = 2, add touches [3, 4]
answer [2, 1, 1, 0], tree [1, 2, 1, 4]
n = 3000, distinct values 2211
value range needs 1997989092 slots; compressed tree needs 2212
brute force: total 2279820, pairs compared 4498500
fenwick:     total 2279820, tree cells touched 35273
~~~

The trace matches the table in section 7. In the large test, the values span 1,997,989,092 possible numbers but compress to 2,212 Fenwick cells (2,211 ranks plus the unused cell 0). Brute force and the Fenwick scan agree on the total (2,279,820 inversions), but brute force compared 4,498,500 pairs while the Fenwick tree touched 35,273 cells — about 12 per element.

## 11. Complexity

n = length of the array, m = number of distinct values (m ≤ n).

| Step | Time | Why |
| :--- | :--- | :--- |
| Coordinate compression | O(n log n) | sort the distinct values, then one lookup per element |
| Right-to-left scan | O(n log m) | one prefix query and one add per element, each about log₂ m steps |
| **Total** | **O(n log n)** | vs O(n²) for brute force |

| Space | Bound | Why |
| :--- | :--- | :--- |
| Sorted distinct values + rank lookup | O(m) | one entry per distinct value |
| Fenwick tree | O(m) | m + 1 cells |
| Result | O(n) | one count per element |

In C++, \`std::sort\` is the O(n log n) step and each \`std::lower_bound\` is O(log m).

## 12. Edge Cases

- **Empty array** — m = 0, the loop does not run, the answer is \`[]\`.
- **One element** — the answer is \`[0]\`.
- **All equal** (\`[-1, -1]\`) — one rank; every \`prefix(r − 1)\` is \`prefix(0) = 0\`.
- **Sorted ascending** — all zeros; **sorted descending** — \`[n−1, …, 1, 0]\`, the maximum possible inversion count.
- **Huge or negative values** (\`1000000000\`, \`-2\`) — compression makes them harmless.
- **Large n with the total wanted** — n(n−1)/2 overflows 32-bit integers once n is above about 65,536.

## Common Pitfalls

- **\`int\` for the total.** n(n−1)/2 exceeds \`INT_MAX\` once n is above about 65,536, and signed overflow is undefined behaviour. Use \`long long\`.
- **\`std::unique\` before \`std::sort\`.** It only removes adjacent duplicates, so on unsorted data it leaves them in and the ranks break.
- **\`prefix(r)\` instead of \`prefix(r - 1)\`.** Counts equal values too; \`{-1, -1}\` would give \`{1, 0}\`.
- **0-based ranks.** With rank 0, \`j += j & -j\` never moves and the loop spins forever. \`lower_bound(...) - begin()\` is 0-based, so add 1.
- **A \`size_t\` loop counter going down** (\`for (size_t i = n - 1; i >= 0; i--)\`) never terminates; use a signed \`int\` or count down with \`i-- > 0\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Brute force:</strong> <span style="color:#f0e2c8;">Two loops over all pairs: O(n²). Say it first, then improve it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The scan:</strong> <span style="color:#f0e2c8;">Walk right to left with a frequency table of values already seen; the answer for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i</code> is the count of seen values below <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code>, then add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nums[i]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The Fenwick tree:</strong> <span style="color:#f0e2c8;">Supports add-one and prefix-sum in O(log n) by jumping by the lowest set bit: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i += i &amp; -i</code> to add, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">i -= i &amp; -i</code> to sum.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Compression:</strong> <span style="color:#f0e2c8;">Values can be negative or huge, so map them to 1-based ranks among the sorted distinct values. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix(rank - 1)</code> for strictly smaller. Total O(n log n).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. C++ detail:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sort</code> + <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unique</code> + <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">erase</code>, rank with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lower_bound + 1</code>; a signed loop counter going down; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">long long</code> for totals.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sort</code> before <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unique</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::unique</code> only collapses adjacent equal elements; on unsorted data it leaves duplicates. Our run on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{3, 1, 3, 2, 1}</code> removed nothing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do duplicates work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Equal values share a rank and we query <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prefix(r - 1)</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{-1, -1}</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 0]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">long long</code> for the total?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">n(n−1)/2 exceeds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">INT_MAX</code> past n ≈ 65,536, and signed overflow is undefined behaviour, not just a wrong value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lower_bound</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">upper_bound</code> for the rank?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lower_bound</code> gives the position of the value itself (it is present), so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+ 1</code> is its rank. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">upper_bound</code> would point past it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">std::map</code> with order statistics?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">std::map</code> has no "count keys below x" in O(log n). GCC offers a policy-based ordered tree as an extension, but it is not standard C++; the Fenwick tree is.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Inversion** | A pair i < j with nums[i] > nums[j]; the answers sum to the inversion count |
| **Frequency table** | Array where position v counts how often value v was seen |
| **Fenwick tree (binary indexed tree, BIT)** | Array of partial sums; cell i covers lowbit(i) positions ending at i |
| **Lowest set bit (\`i & -i\`)** | The rightmost 1 bit of i; the Fenwick jump size |
| **Coordinate compression** | Replace values by their ranks among the distinct values |
| **Rank** | 1-based position of a value in the sorted distinct values |
| **Strict vs non-strict comparison** | < excludes equal values, ≤ includes them; here prefix(r − 1) vs prefix(r) |

---
**Conclusion:** Count of smaller numbers after self is a right-to-left scan over a frequency table: each answer is "how many values seen so far are smaller", and then the current value is added. A Fenwick tree makes both steps O(log n) by jumping along the lowest set bit, and coordinate compression — \`sort\`, \`unique\`, \`erase\`, then \`lower_bound + 1\` — shrinks any range of values to 1..m. Query \`prefix(rank - 1)\` for strictly smaller, start ranks at 1, count down with a signed index, keep totals in \`long long\`, and the solution is O(n log n): 35,273 cells touched against 4,498,500 brute-force comparisons on 3,000 values.`,
        examples: [
          {
            label: `Coordinate compression + Fenwick tree on eight inputs`,
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

std::vector<int> countSmaller(const std::vector<int>& nums) {
    // 1. Coordinate compression: sort a copy, then erase the duplicates
    std::vector<int> sorted = nums;
    std::sort(sorted.begin(), sorted.end());
    sorted.erase(std::unique(sorted.begin(), sorted.end()), sorted.end());
    const int m = static_cast<int>(sorted.size());

    // 2. Fenwick tree (binary indexed tree) over ranks 1..m; tree[0] is unused
    std::vector<int> tree(m + 1, 0);
    std::vector<int> result(nums.size(), 0);

    // 3. Walk right to left: everything already in the tree is to the right
    for (int i = static_cast<int>(nums.size()) - 1; i >= 0; i--) {
        int r = static_cast<int>(std::lower_bound(sorted.begin(), sorted.end(), nums[i]) - sorted.begin()) + 1;
        int total = 0;
        for (int j = r - 1; j > 0; j -= j & -j) total += tree[j]; // ranks 1 .. r-1
        result[i] = total;
        for (int j = r; j <= m; j += j & -j) tree[j]++;
    }
    return result;
}

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

int main() {
    std::cout << fmt(countSmaller({5, 2, 6, 1})) << "\\n";                // [2, 1, 1, 0]
    std::cout << fmt(countSmaller({-1})) << "\\n";                        // [0]
    std::cout << fmt(countSmaller({-1, -1})) << "\\n";                    // [0, 0]
    std::cout << fmt(countSmaller({})) << "\\n";                          // []
    std::cout << fmt(countSmaller({2, 0, 1})) << "\\n";                   // [2, 0, 0]
    std::cout << fmt(countSmaller({3, -2, 1000000000, -2, 7})) << "\\n";  // [2, 0, 2, 0, 0]
    std::cout << fmt(countSmaller({1, 2, 3, 4})) << "\\n";                // [0, 0, 0, 0]
    std::cout << fmt(countSmaller({4, 3, 2, 1})) << "\\n";                // [3, 2, 1, 0]
}`,
          },
          {
            label: `Fenwick trace on [5, 2, 6, 1], brute force vs Fenwick on 3,000 values`,
            code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct Fenwick {
    int m;
    std::vector<int> tree; // index 0 unused
    long long touched = 0;

    explicit Fenwick(int m) : m(m), tree(m + 1, 0) {}

    std::vector<int> add(int i) {
        std::vector<int> path;
        for (; i <= m; i += i & -i) {
            tree[i]++;
            path.push_back(i);
            touched++;
        }
        return path;
    }

    int prefix(int i) {
        int total = 0;
        for (; i > 0; i -= i & -i) {
            total += tree[i];
            touched++;
        }
        return total;
    }
};

std::vector<int> sortedUnique(std::vector<int> v) {
    std::sort(v.begin(), v.end());
    v.erase(std::unique(v.begin(), v.end()), v.end());
    return v;
}

int rankOf(const std::vector<int>& su, int x) {
    return static_cast<int>(std::lower_bound(su.begin(), su.end(), x) - su.begin()) + 1;
}

std::string fmt(const std::vector<int>& xs) {
    std::string s = "[";
    for (size_t i = 0; i < xs.size(); i++) s += (i ? ", " : "") + std::to_string(xs[i]);
    return s + "]";
}

long long seed = 2024;
int nxt() {
    seed = seed * 48271 % 2147483647LL;
    return static_cast<int>(seed);
}

int main() {
    // Part 1: trace [5, 2, 6, 1]
    std::vector<int> nums = {5, 2, 6, 1};
    std::vector<int> su = sortedUnique(nums);
    std::vector<int> rk;
    for (int v : nums) rk.push_back(rankOf(su, v));
    std::cout << "sorted unique " << fmt(su) << ", ranks " << fmt(rk) << "\\n";
    Fenwick fw(static_cast<int>(su.size()));
    std::vector<int> res(nums.size(), 0);
    for (int i = static_cast<int>(nums.size()) - 1; i >= 0; i--) {
        res[i] = fw.prefix(rk[i] - 1);
        std::vector<int> path = fw.add(rk[i]);
        std::cout << "i=" << i << " value " << nums[i] << " rank " << rk[i] << ": smaller = prefix(" << rk[i] - 1
                  << ") = " << res[i] << ", add touches " << fmt(path) << "\\n";
    }
    std::cout << "answer " << fmt(res) << ", tree " << fmt(std::vector<int>(fw.tree.begin() + 1, fw.tree.end())) << "\\n";

    // Part 2: 3000 values in [-10^9, 10^9] with some duplicates, brute force vs Fenwick
    const int n = 3000;
    std::vector<int> a;
    for (int i = 0; i < n; i++) {
        if (i > 0 && nxt() % 4 == 0) a.push_back(a[nxt() % i]); // copy an earlier value
        else a.push_back(nxt() % 2000000001 - 1000000000);
    }

    long long pairs = 0, bruteTotal = 0;
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            pairs++;
            if (a[j] < a[i]) bruteTotal++;
        }
    }

    su = sortedUnique(a);
    Fenwick big(static_cast<int>(su.size()));
    long long fenTotal = 0; // up to n(n-1)/2: overflows int once n passes about 65,536
    for (int i = n - 1; i >= 0; i--) {
        int r = rankOf(su, a[i]);
        fenTotal += big.prefix(r - 1);
        big.add(r);
    }

    long long range = static_cast<long long>(su.back()) - su.front() + 1; // long long: max - min overflows int when values span the whole int range
    std::cout << "n = 3000, distinct values " << su.size() << "\\n";
    std::cout << "value range needs " << range << " slots; compressed tree needs " << su.size() + 1 << "\\n";
    std::cout << "brute force: total " << bruteTotal << ", pairs compared " << pairs << "\\n";
    std::cout << "fenwick:     total " << fenTotal << ", tree cells touched " << big.touched << "\\n";
}`,
          },
        ],
      },
    },
  },
];

export default augments;
