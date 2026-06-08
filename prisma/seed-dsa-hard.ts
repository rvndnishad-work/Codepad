/**
 * Seed script: HARD-tier multi-language DSA challenges (function-harness judge).
 * Source: LeetCode-style problems. Fills the previously-empty hard tier.
 *
 * Run with: npx tsx prisma/seed-dsa-hard.ts
 *
 * Idempotent: upserts Challenge + its single ChallengeStep by slug/position.
 * Expected outputs are computed HERE via JS reference solutions (deterministic,
 * Piston-independent). The live judge re-runs candidate code on Piston and
 * compares against these expected values. Per-language starter stubs are
 * generated from the contract via genStub().
 *
 * Mirrors prisma/seed-interview-prep.ts — same shape, same persistence.
 */
import { PrismaClient } from "@prisma/client";
import { genStub } from "../src/lib/judge/harness";
import type { Contract, ContractType, ReturnType, CompareMode } from "../src/lib/judge/types";

const prisma = new PrismaClient();

const DSA_LANGS = ["python", "javascript", "typescript", "go", "java", "cpp", "rust"];

type ProblemCase = {
  name: string;
  args: unknown[];
  isHidden?: boolean;
  weight?: number;
};

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
    slug: "ip-trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "hard",
    topics: ["two-pointers", "stack"],
    estimatedMinutes: 40,
    description:
      "Given `height`, an array of non-negative integers representing an elevation map where the width of each bar is 1, return how much water it can trap after raining.\n\n### Example\n```\nheight = [0,1,0,2,1,0,1,3,2,1,2,1]  =>  6\n```",
    functionName: "trap",
    params: [{ name: "height", type: "int[]" }],
    returnType: "int",
    ref: (height: number[]) => {
      let l = 0,
        r = height.length - 1,
        lm = 0,
        rm = 0,
        res = 0;
      while (l < r) {
        if (height[l] < height[r]) {
          lm = Math.max(lm, height[l]);
          res += lm - height[l];
          l++;
        } else {
          rm = Math.max(rm, height[r]);
          res += rm - height[r];
          r--;
        }
      }
      return res;
    },
    cases: [
      { name: "classic", args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]] },
      { name: "valley", args: [[4, 2, 0, 3, 2, 5]] },
      { name: "empty", args: [[]] },
      { name: "monotone", args: [[1, 2, 3]], isHidden: true },
      { name: "deep", args: [[3, 0, 2, 0, 4]], isHidden: true },
    ],
  },
  {
    slug: "ip-median-two-sorted",
    title: "Median of Two Sorted Arrays",
    difficulty: "hard",
    topics: ["binary-search", "arrays"],
    estimatedMinutes: 45,
    compare: "float",
    description:
      "Given two sorted ascending arrays `a` and `b`, return the median of the combined set as a floating-point number.\n\n### Example\n```\na = [1,3], b = [2]     => 2.0\na = [1,2], b = [3,4]   => 2.5\n```",
    functionName: "findMedianSortedArrays",
    params: [
      { name: "a", type: "int[]" },
      { name: "b", type: "int[]" },
    ],
    returnType: "double",
    ref: (a: number[], b: number[]) => {
      const m = [...a, ...b].sort((x, y) => x - y);
      const n = m.length;
      if (n === 0) return 0;
      return n % 2 ? m[(n - 1) / 2] : (m[n / 2 - 1] + m[n / 2]) / 2;
    },
    cases: [
      { name: "odd", args: [[1, 3], [2]] },
      { name: "even", args: [[1, 2], [3, 4]] },
      { name: "one-empty", args: [[], [1]] },
      { name: "zeros", args: [[0, 0], [0, 0]], isHidden: true },
      { name: "uneven", args: [[1, 2, 3, 4, 5], [6, 7, 8]], isHidden: true },
    ],
  },
  {
    slug: "ip-edit-distance",
    title: "Edit Distance",
    difficulty: "hard",
    topics: ["dynamic-programming", "strings"],
    estimatedMinutes: 40,
    description:
      "Given two strings `a` and `b`, return the minimum number of single-character operations (insert, delete, replace) to convert `a` into `b` (Levenshtein distance).\n\n### Example\n```\na = \"horse\", b = \"ros\"  =>  3\n```",
    functionName: "minDistance",
    params: [
      { name: "a", type: "string" },
      { name: "b", type: "string" },
    ],
    returnType: "int",
    ref: (a: string, b: string) => {
      const m = a.length,
        n = b.length;
      const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++) {
          dp[i][j] =
            a[i - 1] === b[j - 1]
              ? dp[i - 1][j - 1]
              : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
        }
      return dp[m][n];
    },
    cases: [
      { name: "horse-ros", args: ["horse", "ros"] },
      { name: "intention", args: ["intention", "execution"] },
      { name: "from-empty", args: ["", "abc"] },
      { name: "equal", args: ["abc", "abc"], isHidden: true },
      { name: "sun-sat", args: ["sunday", "saturday"], isHidden: true },
    ],
  },
  {
    slug: "ip-sliding-window-max",
    title: "Sliding Window Maximum",
    difficulty: "hard",
    topics: ["deque", "sliding-window"],
    estimatedMinutes: 40,
    description:
      "Given an array `nums` and a window size `k`, return an array of the maximum of each contiguous window of size `k`, left to right.\n\n### Example\n```\nnums = [1,3,-1,-3,5,3,6,7], k = 3  =>  [3,3,5,5,6,7]\n```",
    functionName: "maxSlidingWindow",
    params: [
      { name: "nums", type: "int[]" },
      { name: "k", type: "int" },
    ],
    returnType: "int[]",
    ref: (nums: number[], k: number) => {
      const dq: number[] = [];
      const out: number[] = [];
      for (let i = 0; i < nums.length; i++) {
        while (dq.length && dq[0] <= i - k) dq.shift();
        while (dq.length && nums[dq[dq.length - 1]] <= nums[i]) dq.pop();
        dq.push(i);
        if (i >= k - 1) out.push(nums[dq[0]]);
      }
      return out;
    },
    cases: [
      { name: "classic", args: [[1, 3, -1, -3, 5, 3, 6, 7], 3] },
      { name: "single", args: [[1], 1] },
      { name: "descending", args: [[9, 8, 7, 6], 2] },
      { name: "k=1", args: [[1, 2, 3, 4, 5], 1], isHidden: true },
    ],
  },
  {
    slug: "ip-min-window-substring",
    title: "Minimum Window Substring",
    difficulty: "hard",
    topics: ["sliding-window", "strings"],
    estimatedMinutes: 40,
    description:
      "Given strings `s` and `t`, return the shortest substring of `s` that contains every character of `t` (including multiplicity). If none exists, return the empty string. The minimal window is unique for the given inputs.\n\n### Example\n```\ns = \"ADOBECODEBANC\", t = \"ABC\"  =>  \"BANC\"\n```",
    functionName: "minWindow",
    params: [
      { name: "s", type: "string" },
      { name: "t", type: "string" },
    ],
    returnType: "string",
    ref: (s: string, t: string) => {
      if (t.length === 0 || s.length === 0) return "";
      const need = new Map<string, number>();
      for (const c of t) need.set(c, (need.get(c) || 0) + 1);
      const required = need.size;
      const window = new Map<string, number>();
      let formed = 0,
        l = 0;
      let best: [number, number, number] = [Infinity, 0, 0];
      for (let r = 0; r < s.length; r++) {
        const c = s[r];
        window.set(c, (window.get(c) || 0) + 1);
        if (need.has(c) && window.get(c) === need.get(c)) formed++;
        while (formed === required) {
          if (r - l + 1 < best[0]) best = [r - l + 1, l, r];
          const lc = s[l];
          window.set(lc, (window.get(lc) as number) - 1);
          if (need.has(lc) && (window.get(lc) as number) < (need.get(lc) as number)) formed--;
          l++;
        }
      }
      return best[0] === Infinity ? "" : s.slice(best[1], best[2] + 1);
    },
    cases: [
      { name: "classic", args: ["ADOBECODEBANC", "ABC"] },
      { name: "single", args: ["a", "a"] },
      { name: "impossible", args: ["a", "aa"] },
      { name: "dupes", args: ["aa", "aa"], isHidden: true },
      { name: "scattered", args: ["cabwefgewcwaefgcf", "cae"], isHidden: true },
    ],
  },
  {
    slug: "ip-largest-rectangle",
    title: "Largest Rectangle in Histogram",
    difficulty: "hard",
    topics: ["stack", "monotonic-stack"],
    estimatedMinutes: 40,
    description:
      "Given `heights` representing a histogram where each bar has width 1, return the area of the largest rectangle that fits entirely within the histogram.\n\n### Example\n```\nheights = [2,1,5,6,2,3]  =>  10\n```",
    functionName: "largestRectangleArea",
    params: [{ name: "heights", type: "int[]" }],
    returnType: "int",
    ref: (heights: number[]) => {
      const st: number[] = [];
      let best = 0;
      const a = [...heights, 0];
      for (let i = 0; i < a.length; i++) {
        while (st.length && a[st[st.length - 1]] > a[i]) {
          const h = a[st.pop() as number];
          const w = st.length ? i - st[st.length - 1] - 1 : i;
          best = Math.max(best, h * w);
        }
        st.push(i);
      }
      return best;
    },
    cases: [
      { name: "classic", args: [[2, 1, 5, 6, 2, 3]] },
      { name: "two", args: [[2, 4]] },
      { name: "empty", args: [[]] },
      { name: "flat", args: [[1, 1, 1, 1]], isHidden: true },
      { name: "peaks", args: [[6, 2, 5, 4, 5, 1, 6]], isHidden: true },
    ],
  },
  {
    slug: "ip-word-ladder",
    title: "Word Ladder",
    difficulty: "hard",
    topics: ["bfs", "graphs"],
    estimatedMinutes: 45,
    description:
      "Given `beginWord`, `endWord`, and a `wordList`, return the number of words in the shortest transformation sequence from `beginWord` to `endWord`, changing one letter at a time where each intermediate word must be in `wordList`. Return 0 if no such sequence exists. Count includes both endpoints.\n\n### Example\n```\nbegin = \"hit\", end = \"cog\", list = [\"hot\",\"dot\",\"dog\",\"lot\",\"log\",\"cog\"]  =>  5\n```",
    functionName: "ladderLength",
    params: [
      { name: "beginWord", type: "string" },
      { name: "endWord", type: "string" },
      { name: "wordList", type: "string[]" },
    ],
    returnType: "int",
    ref: (beginWord: string, endWord: string, wordList: string[]) => {
      const dict = new Set(wordList);
      if (!dict.has(endWord)) return 0;
      let queue = [beginWord];
      let steps = 1;
      const seen = new Set([beginWord]);
      while (queue.length) {
        const next: string[] = [];
        for (const w of queue) {
          if (w === endWord) return steps;
          for (let i = 0; i < w.length; i++) {
            for (let c = 97; c <= 122; c++) {
              const cand = w.slice(0, i) + String.fromCharCode(c) + w.slice(i + 1);
              if (dict.has(cand) && !seen.has(cand)) {
                seen.add(cand);
                next.push(cand);
              }
            }
          }
        }
        queue = next;
        steps++;
      }
      return 0;
    },
    cases: [
      { name: "reachable", args: ["hit", "cog", ["hot", "dot", "dog", "lot", "log", "cog"]] },
      { name: "no-end", args: ["hit", "cog", ["hot", "dot", "dog", "lot", "log"]] },
      { name: "adjacent", args: ["a", "c", ["a", "b", "c"]] },
      { name: "short", args: ["hot", "dog", ["hot", "dog", "dot"]], isHidden: true },
    ],
  },
  {
    slug: "ip-word-break",
    title: "Word Break",
    difficulty: "hard",
    topics: ["dynamic-programming", "strings"],
    estimatedMinutes: 35,
    description:
      "Given a string `s` and a dictionary `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of one or more dictionary words.\n\n### Example\n```\ns = \"leetcode\", wordDict = [\"leet\",\"code\"]  =>  true\n```",
    functionName: "wordBreak",
    params: [
      { name: "s", type: "string" },
      { name: "wordDict", type: "string[]" },
    ],
    returnType: "bool",
    ref: (s: string, wordDict: string[]) => {
      const dict = new Set(wordDict);
      const dp = new Array(s.length + 1).fill(false);
      dp[0] = true;
      for (let i = 1; i <= s.length; i++) {
        for (let j = 0; j < i; j++) {
          if (dp[j] && dict.has(s.slice(j, i))) {
            dp[i] = true;
            break;
          }
        }
      }
      return dp[s.length];
    },
    cases: [
      { name: "splits", args: ["leetcode", ["leet", "code"]] },
      { name: "reuse", args: ["applepenapple", ["apple", "pen"]] },
      { name: "no", args: ["catsandog", ["cats", "dog", "sand", "and", "cat"]] },
      { name: "single", args: ["a", ["a"]], isHidden: true },
    ],
  },
  {
    slug: "ip-lis",
    title: "Longest Increasing Subsequence",
    difficulty: "hard",
    topics: ["dynamic-programming", "binary-search"],
    estimatedMinutes: 35,
    description:
      "Given an integer array `nums`, return the length of the longest strictly increasing subsequence.\n\n### Example\n```\nnums = [10,9,2,5,3,7,101,18]  =>  4   ([2,3,7,101])\n```",
    functionName: "lengthOfLIS",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    ref: (nums: number[]) => {
      const tails: number[] = [];
      for (const x of nums) {
        let lo = 0,
          hi = tails.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (tails[mid] < x) lo = mid + 1;
          else hi = mid;
        }
        tails[lo] = x;
      }
      return tails.length;
    },
    cases: [
      { name: "classic", args: [[10, 9, 2, 5, 3, 7, 101, 18]] },
      { name: "dup-runs", args: [[0, 1, 0, 3, 2, 3]] },
      { name: "all-equal", args: [[7, 7, 7, 7]] },
      { name: "empty", args: [[]], isHidden: true },
      { name: "mixed", args: [[4, 10, 4, 3, 8, 9]], isHidden: true },
    ],
  },
  {
    slug: "ip-course-schedule",
    title: "Course Schedule",
    difficulty: "hard",
    topics: ["graphs", "topological-sort"],
    estimatedMinutes: 35,
    description:
      "There are `numCourses` courses labeled `0..numCourses-1`. `prerequisites[i] = [a, b]` means you must take course `b` before course `a`. Return `true` if you can finish all courses (i.e. the dependency graph has no cycle).\n\n### Example\n```\nnumCourses = 2, prerequisites = [[1,0]]        => true\nnumCourses = 2, prerequisites = [[1,0],[0,1]]  => false\n```",
    functionName: "canFinish",
    params: [
      { name: "numCourses", type: "int" },
      { name: "prerequisites", type: "int[][]" },
    ],
    returnType: "bool",
    ref: (numCourses: number, prerequisites: number[][]) => {
      const adj: number[][] = Array.from({ length: numCourses }, () => []);
      const indeg = new Array(numCourses).fill(0);
      for (const [a, b] of prerequisites) {
        adj[b].push(a);
        indeg[a]++;
      }
      const q: number[] = [];
      for (let i = 0; i < numCourses; i++) if (indeg[i] === 0) q.push(i);
      let cnt = 0;
      while (q.length) {
        const u = q.shift() as number;
        cnt++;
        for (const v of adj[u]) if (--indeg[v] === 0) q.push(v);
      }
      return cnt === numCourses;
    },
    cases: [
      { name: "linear", args: [2, [[1, 0]]] },
      { name: "cycle", args: [2, [[1, 0], [0, 1]]] },
      { name: "chain", args: [4, [[1, 0], [2, 1], [3, 2]]] },
      { name: "triangle", args: [3, [[0, 1], [1, 2], [2, 0]]], isHidden: true },
    ],
  },
  {
    slug: "ip-jump-game-2",
    title: "Jump Game II",
    difficulty: "hard",
    topics: ["greedy", "arrays"],
    estimatedMinutes: 35,
    description:
      "Given an array `nums` where `nums[i]` is the maximum jump length from index `i`, return the minimum number of jumps to reach the last index (assume it is always reachable).\n\n### Example\n```\nnums = [2,3,1,1,4]  =>  2\n```",
    functionName: "jump",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    ref: (nums: number[]) => {
      let jumps = 0,
        curEnd = 0,
        farthest = 0;
      for (let i = 0; i < nums.length - 1; i++) {
        farthest = Math.max(farthest, i + nums[i]);
        if (i === curEnd) {
          jumps++;
          curEnd = farthest;
        }
      }
      return jumps;
    },
    cases: [
      { name: "classic", args: [[2, 3, 1, 1, 4]] },
      { name: "alt", args: [[2, 3, 0, 1, 4]] },
      { name: "single", args: [[0]] },
      { name: "flat", args: [[1, 1, 1, 1]], isHidden: true },
      { name: "one-jump", args: [[5, 1, 1, 1, 1]], isHidden: true },
    ],
  },
  {
    slug: "ip-longest-consecutive",
    title: "Longest Consecutive Sequence",
    difficulty: "hard",
    topics: ["hashing", "arrays"],
    estimatedMinutes: 35,
    description:
      "Given an unsorted array `nums`, return the length of the longest run of consecutive integers (e.g. `1,2,3,4`). Aim for O(n).\n\n### Example\n```\nnums = [100,4,200,1,3,2]  =>  4   ([1,2,3,4])\n```",
    functionName: "longestConsecutive",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    ref: (nums: number[]) => {
      const set = new Set(nums);
      let best = 0;
      for (const x of set) {
        if (!set.has(x - 1)) {
          let cur = x,
            len = 1;
          while (set.has(cur + 1)) {
            cur++;
            len++;
          }
          best = Math.max(best, len);
        }
      }
      return best;
    },
    cases: [
      { name: "classic", args: [[100, 4, 200, 1, 3, 2]] },
      { name: "long", args: [[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]] },
      { name: "empty", args: [[]] },
      { name: "with-dupes", args: [[1, 2, 0, 1]], isHidden: true },
    ],
  },
];

async function main() {
  let created = 0;
  for (const p of PROBLEMS) {
    const contract: Contract = {
      functionName: p.functionName,
      params: p.params,
      returnType: p.returnType,
    };

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
    const minutes = p.estimatedMinutes ?? 35;

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
    console.log(
      `  ✓ ${p.slug} (${p.difficulty}) — ${harnessTests.length} cases, ${Object.keys(starterCode).length} langs`
    );
  }
  console.log(`\nSeeded ${created} hard DSA challenges.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
