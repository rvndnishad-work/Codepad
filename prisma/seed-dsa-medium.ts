/**
 * Seed script: MEDIUM-tier multi-language DSA challenges (function-harness judge).
 * Source: LeetCode-style problems. Rounds out the thin medium tier.
 *
 * Run with: npx tsx prisma/seed-dsa-medium.ts
 *
 * Only problems with DETERMINISTIC output are included (so exact/unordered
 * comparison is reliable). Order-ambiguous problems (3Sum, Group Anagrams) are
 * intentionally excluded from the harness.
 *
 * Idempotent: upserts Challenge + its single ChallengeStep by slug/position.
 * Mirrors prisma/seed-interview-prep.ts.
 */
import { PrismaClient } from "@prisma/client";
import { genStub } from "../src/lib/judge/harness";
import type { Contract, ContractType, ReturnType, CompareMode } from "../src/lib/judge/types";

const prisma = new PrismaClient();
const DSA_LANGS = ["python", "javascript", "typescript", "go", "java", "cpp", "rust"];

type ProblemCase = { name: string; args: unknown[]; isHidden?: boolean; weight?: number };
type Problem = {
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  functionName: string;
  params: { name: string; type: ContractType }[];
  returnType: ReturnType;
  compare?: CompareMode;
  topics?: string[];
  estimatedMinutes?: number;
  ref: (...args: any[]) => unknown;
  cases: ProblemCase[];
};

const PROBLEMS: Problem[] = [
  {
    slug: "ip-longest-substring",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "medium",
    topics: ["sliding-window", "strings"],
    estimatedMinutes: 25,
    description:
      "Given a string `s`, return the length of the longest substring without repeating characters.\n\n```\ns = \"abcabcbb\"  =>  3   (\"abc\")\n```",
    functionName: "lengthOfLongestSubstring",
    params: [{ name: "s", type: "string" }],
    returnType: "int",
    ref: (s: string) => {
      const seen = new Map<string, number>();
      let l = 0,
        best = 0;
      for (let r = 0; r < s.length; r++) {
        const c = s[r];
        if (seen.has(c) && (seen.get(c) as number) >= l) l = (seen.get(c) as number) + 1;
        seen.set(c, r);
        best = Math.max(best, r - l + 1);
      }
      return best;
    },
    cases: [
      { name: "classic", args: ["abcabcbb"] },
      { name: "all-same", args: ["bbbbb"] },
      { name: "pwwkew", args: ["pwwkew"] },
      { name: "empty", args: [""] },
      { name: "dvdf", args: ["dvdf"], isHidden: true },
    ],
  },
  {
    slug: "ip-product-except-self",
    title: "Product of Array Except Self",
    difficulty: "medium",
    topics: ["prefix-products", "arrays"],
    estimatedMinutes: 25,
    description:
      "Given `nums`, return an array `out` where `out[i]` is the product of all elements except `nums[i]`. Do it without division.\n\n```\nnums = [1,2,3,4]  =>  [24,12,8,6]\n```",
    functionName: "productExceptSelf",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int[]",
    ref: (nums: number[]) => {
      const n = nums.length;
      const out = new Array(n).fill(1);
      let pre = 1;
      for (let i = 0; i < n; i++) {
        out[i] = pre;
        pre *= nums[i];
      }
      let post = 1;
      for (let i = n - 1; i >= 0; i--) {
        out[i] *= post;
        post *= nums[i];
      }
      return out;
    },
    cases: [
      { name: "classic", args: [[1, 2, 3, 4]] },
      { name: "with-zero", args: [[-1, 1, 0, -3, 3]] },
      { name: "pair", args: [[2, 3]] },
      { name: "ones", args: [[1, 1, 1]], isHidden: true },
    ],
  },
  {
    slug: "ip-valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "medium",
    topics: ["stack", "strings"],
    estimatedMinutes: 20,
    description:
      "Given a string `s` of just `()[]{}`, return `true` if every bracket is closed by the same type in the correct order.\n\n```\n\"()[]{}\" => true     \"([)]\" => false\n```",
    functionName: "isValid",
    params: [{ name: "s", type: "string" }],
    returnType: "bool",
    ref: (s: string) => {
      const st: string[] = [];
      const m: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
      for (const c of s) {
        if (c === "(" || c === "[" || c === "{") st.push(c);
        else if (st.pop() !== m[c]) return false;
      }
      return st.length === 0;
    },
    cases: [
      { name: "simple", args: ["()"] },
      { name: "mixed", args: ["()[]{}"] },
      { name: "wrong", args: ["(]"] },
      { name: "interleaved", args: ["([)]"] },
      { name: "nested", args: ["{[]}"], isHidden: true },
    ],
  },
  {
    slug: "ip-top-k-frequent",
    title: "Top K Frequent Elements",
    difficulty: "medium",
    topics: ["hashing", "heap"],
    estimatedMinutes: 25,
    compare: "unordered",
    description:
      "Given an integer array `nums` and an integer `k`, return the `k` most frequent elements. The answer is unique for the given inputs; return order does not matter.\n\n```\nnums = [1,1,1,2,2,3], k = 2  =>  [1,2]\n```",
    functionName: "topKFrequent",
    params: [
      { name: "nums", type: "int[]" },
      { name: "k", type: "int" },
    ],
    returnType: "int[]",
    ref: (nums: number[], k: number) => {
      const f = new Map<number, number>();
      for (const x of nums) f.set(x, (f.get(x) || 0) + 1);
      return [...f.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map((e) => e[0]);
    },
    cases: [
      { name: "classic", args: [[1, 1, 1, 2, 2, 3], 2] },
      { name: "single", args: [[1], 1] },
      { name: "two", args: [[4, 4, 4, 5, 5, 6], 2] },
      { name: "top1", args: [[7, 7, 8, 8, 8, 9], 1], isHidden: true },
    ],
  },
  {
    slug: "ip-kth-largest",
    title: "Kth Largest Element in an Array",
    difficulty: "medium",
    topics: ["heap", "sorting"],
    estimatedMinutes: 25,
    description:
      "Return the `k`-th largest element in `nums` (the k-th in sorted-descending order, not the k-th distinct).\n\n```\nnums = [3,2,1,5,6,4], k = 2  =>  5\n```",
    functionName: "findKthLargest",
    params: [
      { name: "nums", type: "int[]" },
      { name: "k", type: "int" },
    ],
    returnType: "int",
    ref: (nums: number[], k: number) => [...nums].sort((a, b) => b - a)[k - 1],
    cases: [
      { name: "classic", args: [[3, 2, 1, 5, 6, 4], 2] },
      { name: "dupes", args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4] },
      { name: "single", args: [[1], 1] },
      { name: "last", args: [[7, 6, 5, 4, 3, 2, 1], 7], isHidden: true },
    ],
  },
  {
    slug: "ip-search-rotated",
    title: "Search in Rotated Sorted Array",
    difficulty: "medium",
    topics: ["binary-search", "arrays"],
    estimatedMinutes: 25,
    description:
      "An ascending array of distinct integers is rotated at an unknown pivot. Given `nums` and `target`, return its index, or `-1`. Aim for O(log n).\n\n```\nnums = [4,5,6,7,0,1,2], target = 0  =>  4\n```",
    functionName: "search",
    params: [
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" },
    ],
    returnType: "int",
    ref: (nums: number[], target: number) => {
      let lo = 0,
        hi = nums.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (nums[mid] === target) return mid;
        if (nums[lo] <= nums[mid]) {
          if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
          else lo = mid + 1;
        } else {
          if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
          else hi = mid - 1;
        }
      }
      return -1;
    },
    cases: [
      { name: "found", args: [[4, 5, 6, 7, 0, 1, 2], 0] },
      { name: "missing", args: [[4, 5, 6, 7, 0, 1, 2], 3] },
      { name: "single-miss", args: [[1], 0] },
      { name: "pivot0", args: [[5, 1, 3], 5], isHidden: true },
    ],
  },
  {
    slug: "ip-coin-change",
    title: "Coin Change",
    difficulty: "medium",
    topics: ["dynamic-programming"],
    estimatedMinutes: 30,
    description:
      "Given coin denominations `coins` and a total `amount`, return the fewest coins needed to make `amount`, or `-1` if impossible. Unlimited coins of each type.\n\n```\ncoins = [1,2,5], amount = 11  =>  3   (5+5+1)\n```",
    functionName: "coinChange",
    params: [
      { name: "coins", type: "int[]" },
      { name: "amount", type: "int" },
    ],
    returnType: "int",
    ref: (coins: number[], amount: number) => {
      const dp = new Array(amount + 1).fill(Infinity);
      dp[0] = 0;
      for (let a = 1; a <= amount; a++) {
        for (const c of coins) if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;
      }
      return dp[amount] === Infinity ? -1 : dp[amount];
    },
    cases: [
      { name: "classic", args: [[1, 2, 5], 11] },
      { name: "impossible", args: [[2], 3] },
      { name: "zero", args: [[1], 0] },
      { name: "hundred", args: [[1, 2, 5], 100], isHidden: true },
    ],
  },
  {
    slug: "ip-house-robber",
    title: "House Robber",
    difficulty: "medium",
    topics: ["dynamic-programming"],
    estimatedMinutes: 25,
    description:
      "Given `nums` (money in each house), return the max you can rob without robbing two adjacent houses.\n\n```\nnums = [2,7,9,3,1]  =>  12   (2 + 9 + 1)\n```",
    functionName: "rob",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    ref: (nums: number[]) => {
      let prev = 0,
        cur = 0;
      for (const x of nums) {
        const t = Math.max(cur, prev + x);
        prev = cur;
        cur = t;
      }
      return cur;
    },
    cases: [
      { name: "small", args: [[1, 2, 3, 1]] },
      { name: "classic", args: [[2, 7, 9, 3, 1]] },
      { name: "empty", args: [[]] },
      { name: "single", args: [[5]], isHidden: true },
    ],
  },
  {
    slug: "ip-num-islands",
    title: "Number of Islands",
    difficulty: "medium",
    topics: ["graphs", "dfs", "grid"],
    estimatedMinutes: 30,
    description:
      "Given a grid of `1`s (land) and `0`s (water), return the number of islands. An island is connected horizontally/vertically.\n\n```\n[[1,1,0],[1,0,0],[0,0,1]]  =>  2\n```",
    functionName: "numIslands",
    params: [{ name: "grid", type: "int[][]" }],
    returnType: "int",
    ref: (grid: number[][]) => {
      if (!grid.length) return 0;
      const R = grid.length,
        C = grid[0].length;
      const g = grid.map((r) => [...r]);
      let count = 0;
      const dfs = (i: number, j: number) => {
        if (i < 0 || j < 0 || i >= R || j >= C || g[i][j] !== 1) return;
        g[i][j] = 0;
        dfs(i + 1, j);
        dfs(i - 1, j);
        dfs(i, j + 1);
        dfs(i, j - 1);
      };
      for (let i = 0; i < R; i++)
        for (let j = 0; j < C; j++)
          if (g[i][j] === 1) {
            count++;
            dfs(i, j);
          }
      return count;
    },
    cases: [
      { name: "two", args: [[[1, 1, 0], [1, 0, 0], [0, 0, 1]]] },
      { name: "one-big", args: [[[1, 1, 1], [1, 1, 1]]] },
      { name: "none", args: [[[0, 0], [0, 0]]] },
      { name: "checker", args: [[[1, 0, 1], [0, 1, 0], [1, 0, 1]]], isHidden: true },
    ],
  },
  {
    slug: "ip-sort-colors",
    title: "Sort Colors",
    difficulty: "medium",
    topics: ["two-pointers", "sorting"],
    estimatedMinutes: 20,
    description:
      "Given `nums` containing only `0`, `1`, `2` (red/white/blue), return them sorted in non-decreasing order. Try a one-pass Dutch-national-flag solution.\n\n```\n[2,0,2,1,1,0]  =>  [0,0,1,1,2,2]\n```",
    functionName: "sortColors",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int[]",
    ref: (nums: number[]) => [...nums].sort((a, b) => a - b),
    cases: [
      { name: "classic", args: [[2, 0, 2, 1, 1, 0]] },
      { name: "tiny", args: [[2, 0, 1]] },
      { name: "single", args: [[0]] },
      { name: "mixed", args: [[1, 2, 0, 2, 1, 0, 1]], isHidden: true },
    ],
  },
  {
    slug: "ip-rotate-array",
    title: "Rotate Array",
    difficulty: "medium",
    topics: ["arrays"],
    estimatedMinutes: 20,
    description:
      "Rotate `nums` to the right by `k` steps and return the result. `k` may be larger than the array length.\n\n```\nnums = [1,2,3,4,5,6,7], k = 3  =>  [5,6,7,1,2,3,4]\n```",
    functionName: "rotate",
    params: [
      { name: "nums", type: "int[]" },
      { name: "k", type: "int" },
    ],
    returnType: "int[]",
    ref: (nums: number[], k: number) => {
      const n = nums.length;
      if (n === 0) return [];
      k = ((k % n) + n) % n;
      return [...nums.slice(n - k), ...nums.slice(0, n - k)];
    },
    cases: [
      { name: "classic", args: [[1, 2, 3, 4, 5, 6, 7], 3] },
      { name: "by-two", args: [[-1, -100, 3, 99], 2] },
      { name: "zero", args: [[1, 2], 0] },
      { name: "wrap", args: [[1, 2, 3], 4], isHidden: true },
    ],
  },
  {
    slug: "ip-spiral-matrix",
    title: "Spiral Matrix",
    difficulty: "medium",
    topics: ["matrix", "simulation"],
    estimatedMinutes: 25,
    description:
      "Given an `m x n` matrix, return all elements in spiral order (clockwise from the top-left).\n\n```\n[[1,2,3],[4,5,6],[7,8,9]]  =>  [1,2,3,6,9,8,7,4,5]\n```",
    functionName: "spiralOrder",
    params: [{ name: "matrix", type: "int[][]" }],
    returnType: "int[]",
    ref: (m: number[][]) => {
      const out: number[] = [];
      if (!m.length) return out;
      let top = 0,
        bot = m.length - 1,
        left = 0,
        right = m[0].length - 1;
      while (top <= bot && left <= right) {
        for (let j = left; j <= right; j++) out.push(m[top][j]);
        top++;
        for (let i = top; i <= bot; i++) out.push(m[i][right]);
        right--;
        if (top <= bot) {
          for (let j = right; j >= left; j--) out.push(m[bot][j]);
          bot--;
        }
        if (left <= right) {
          for (let i = bot; i >= top; i--) out.push(m[i][left]);
          left++;
        }
      }
      return out;
    },
    cases: [
      { name: "square", args: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]] },
      { name: "rect", args: [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]] },
      { name: "single", args: [[[1]]] },
      { name: "two-by-two", args: [[[1, 2], [3, 4]]], isHidden: true },
    ],
  },
];

async function main() {
  let created = 0;
  for (const p of PROBLEMS) {
    const contract: Contract = { functionName: p.functionName, params: p.params, returnType: p.returnType };
    const starterCode: Record<string, string> = {};
    for (const lang of DSA_LANGS) {
      try {
        starterCode[lang] = genStub(lang, contract);
      } catch (e) {
        console.warn(`  ! no stub for ${lang} on ${p.slug}: ${(e as Error).message}`);
      }
    }
    const harnessTests = p.cases.map((c, i) => ({
      id: `${p.slug}-${i}`,
      name: c.name,
      argsJson: JSON.stringify(c.args),
      expectedJson: JSON.stringify(p.ref(...c.args)),
      isHidden: Boolean(c.isHidden),
      weight: c.weight ?? 1,
      compare: p.compare ?? "exact",
    }));
    const tags = [...DSA_LANGS, "dsa", ...(p.topics ?? [])];
    const minutes = p.estimatedMinutes ?? 25;

    const challenge = await prisma.challenge.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        category: "DSA",
        tags: JSON.stringify(tags),
        estimatedMinutes: minutes,
        published: true,
        visibility: "public",
      },
      create: {
        slug: p.slug,
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        template: "harness",
        starterFiles: "{}",
        testFiles: "{}",
        category: "DSA",
        tags: JSON.stringify(tags),
        estimatedMinutes: minutes,
        published: true,
        visibility: "public",
      },
      select: { id: true },
    });

    await prisma.challengeStep.upsert({
      where: { challengeId_position: { challengeId: challenge.id, position: 0 } },
      update: {
        description: p.description,
        estimatedMinutes: minutes,
        judgingMode: "harness",
        functionName: p.functionName,
        signatureJson: JSON.stringify({ params: p.params, returnType: p.returnType }),
        languagesJson: JSON.stringify(DSA_LANGS),
        starterCodeJson: JSON.stringify(starterCode),
        harnessTestsJson: JSON.stringify(harnessTests),
        referenceSolutionsJson: "{}",
      },
      create: {
        challengeId: challenge.id,
        position: 0,
        title: p.title,
        description: p.description,
        template: "harness",
        starterFiles: "{}",
        testFiles: "{}",
        estimatedMinutes: minutes,
        judgingMode: "harness",
        functionName: p.functionName,
        signatureJson: JSON.stringify({ params: p.params, returnType: p.returnType }),
        languagesJson: JSON.stringify(DSA_LANGS),
        starterCodeJson: JSON.stringify(starterCode),
        harnessTestsJson: JSON.stringify(harnessTests),
        referenceSolutionsJson: "{}",
      },
    });

    created++;
    console.log(`  ✓ ${p.slug} (${p.difficulty}) — ${harnessTests.length} cases, ${Object.keys(starterCode).length} langs`);
  }
  console.log(`\nSeeded ${created} medium DSA challenges.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
