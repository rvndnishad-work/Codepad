/**
 * Seed script for interview-prep content: multi-language DSA challenges for the
 * function-harness judge, tagged so the tech-stack selector can curate them.
 *
 * Run with: npx tsx prisma/seed-interview-prep.ts
 *
 * Idempotent: upserts Challenge + its single ChallengeStep by slug/position.
 * Expected outputs are computed HERE via JS reference solutions (deterministic,
 * Piston-independent) — the live judge re-runs candidate code on Piston.
 *
 * Backend and frontend prep rounds are served by the existing playground
 * template catalog (console + framework templates), so they need no seed.
 */
import { PrismaClient } from "@prisma/client";
import { genStub } from "../src/lib/judge/harness";
import type { Contract, ContractType, ReturnType, CompareMode } from "../src/lib/judge/types";

const prisma = new PrismaClient();

// All function-harness languages we generate starters for.
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
  /** JS reference used to compute expected outputs at seed time. */
  ref: (...args: any[]) => unknown;
  cases: ProblemCase[];
};

const PROBLEMS: Problem[] = [
  {
    slug: "ip-two-sum",
    title: "Two Sum",
    difficulty: "easy",
    description:
      "Given an array of integers `nums` and an integer `target`, return the **indices** of the two numbers that add up to `target`. Each input has exactly one solution and you may not use the same element twice. Index order does not matter.",
    functionName: "twoSum",
    params: [
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" },
    ],
    returnType: "int[]",
    compare: "unordered",
    ref: (nums: number[], target: number) => {
      const seen = new Map<number, number>();
      for (let i = 0; i < nums.length; i++) {
        const need = target - nums[i];
        if (seen.has(need)) return [seen.get(need)!, i];
        seen.set(nums[i], i);
      }
      return [];
    },
    cases: [
      { name: "basic", args: [[2, 7, 11, 15], 9] },
      { name: "middle", args: [[3, 2, 4], 6] },
      { name: "duplicates", args: [[3, 3], 6] },
      { name: "negatives", args: [[-1, -2, -3, -4, -5], -8], isHidden: true },
      { name: "tail", args: [[1, 5, 9, 2, 8], 10], isHidden: true },
    ],
  },
  {
    slug: "ip-reverse-string",
    title: "Reverse String",
    difficulty: "easy",
    description: "Return the input string `s` reversed.",
    functionName: "reverseString",
    params: [{ name: "s", type: "string" }],
    returnType: "string",
    ref: (s: string) => s.split("").reverse().join(""),
    cases: [
      { name: "word", args: ["hello"] },
      { name: "palindrome", args: ["racecar"] },
      { name: "empty", args: [""] },
      { name: "spaces", args: ["a b c"], isHidden: true },
    ],
  },
  {
    slug: "ip-fizzbuzz",
    title: "Fizz Buzz",
    difficulty: "easy",
    description:
      "Return an array of strings for `1..n`: `\"Fizz\"` for multiples of 3, `\"Buzz\"` for multiples of 5, `\"FizzBuzz\"` for multiples of both, otherwise the number as a string.",
    functionName: "fizzBuzz",
    params: [{ name: "n", type: "int" }],
    returnType: "string[]",
    ref: (n: number) => {
      const out: string[] = [];
      for (let i = 1; i <= n; i++) {
        if (i % 15 === 0) out.push("FizzBuzz");
        else if (i % 3 === 0) out.push("Fizz");
        else if (i % 5 === 0) out.push("Buzz");
        else out.push(String(i));
      }
      return out;
    },
    cases: [
      { name: "n=5", args: [5] },
      { name: "n=15", args: [15] },
      { name: "n=1", args: [1] },
      { name: "n=20", args: [20], isHidden: true },
    ],
  },
  {
    slug: "ip-max-subarray",
    title: "Maximum Subarray",
    difficulty: "medium",
    description:
      "Given an integer array `nums`, return the largest sum of any contiguous non-empty subarray (Kadane's algorithm).",
    functionName: "maxSubArray",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "int",
    ref: (nums: number[]) => {
      let best = nums[0];
      let cur = nums[0];
      for (let i = 1; i < nums.length; i++) {
        cur = Math.max(nums[i], cur + nums[i]);
        best = Math.max(best, cur);
      }
      return best;
    },
    cases: [
      { name: "mixed", args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]] },
      { name: "single", args: [[1]] },
      { name: "all-neg", args: [[-3, -1, -2]] },
      { name: "all-pos", args: [[5, 4, 3]], isHidden: true },
    ],
  },
  {
    slug: "ip-is-palindrome",
    title: "Valid Palindrome",
    difficulty: "easy",
    description:
      "Return `true` if `s` reads the same forwards and backwards considering only lowercase alphanumeric characters (the input is already lowercased and may contain spaces/punctuation).",
    functionName: "isPalindrome",
    params: [{ name: "s", type: "string" }],
    returnType: "bool",
    ref: (s: string) => {
      const cleaned = s.replace(/[^a-z0-9]/g, "");
      return cleaned === cleaned.split("").reverse().join("");
    },
    cases: [
      { name: "phrase", args: ["a man a plan a canal panama"] },
      { name: "not", args: ["hello world"] },
      { name: "empty", args: [""] },
      { name: "alnum", args: ["ab2a"], isHidden: true },
    ],
  },
  {
    slug: "ip-fibonacci",
    title: "Fibonacci Number",
    difficulty: "easy",
    description: "Return the `n`-th Fibonacci number where `fib(0) = 0`, `fib(1) = 1`.",
    functionName: "fib",
    params: [{ name: "n", type: "int" }],
    returnType: "long",
    ref: (n: number) => {
      let a = 0;
      let b = 1;
      for (let i = 0; i < n; i++) {
        [a, b] = [b, a + b];
      }
      return a;
    },
    cases: [
      { name: "n=0", args: [0] },
      { name: "n=1", args: [1] },
      { name: "n=10", args: [10] },
      { name: "n=20", args: [20], isHidden: true },
    ],
  },
  {
    slug: "ip-binary-search",
    title: "Binary Search",
    difficulty: "easy",
    description:
      "Given a **sorted ascending** array `nums` of distinct integers and a `target`, return its index, or `-1` if not present.",
    functionName: "search",
    params: [
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" },
    ],
    returnType: "int",
    ref: (nums: number[], target: number) => {
      let lo = 0;
      let hi = nums.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (nums[mid] === target) return mid;
        if (nums[mid] < target) lo = mid + 1;
        else hi = mid - 1;
      }
      return -1;
    },
    cases: [
      { name: "found", args: [[-1, 0, 3, 5, 9, 12], 9] },
      { name: "missing", args: [[-1, 0, 3, 5, 9, 12], 2] },
      { name: "first", args: [[1, 2, 3], 1] },
      { name: "last", args: [[1, 2, 3, 4, 5], 5], isHidden: true },
    ],
  },
  {
    slug: "ip-merge-sorted",
    title: "Merge Two Sorted Arrays",
    difficulty: "medium",
    description:
      "Given two arrays `a` and `b`, each sorted ascending, return a single sorted array containing all elements of both.",
    functionName: "mergeSorted",
    params: [
      { name: "a", type: "int[]" },
      { name: "b", type: "int[]" },
    ],
    returnType: "int[]",
    ref: (a: number[], b: number[]) => {
      const out: number[] = [];
      let i = 0;
      let j = 0;
      while (i < a.length && j < b.length) {
        if (a[i] <= b[j]) out.push(a[i++]);
        else out.push(b[j++]);
      }
      while (i < a.length) out.push(a[i++]);
      while (j < b.length) out.push(b[j++]);
      return out;
    },
    cases: [
      { name: "interleaved", args: [[1, 3, 5], [2, 4, 6]] },
      { name: "one-empty", args: [[], [1, 2, 3]] },
      { name: "tails", args: [[1, 2, 9], [3, 4]] },
      { name: "dupes", args: [[1, 1, 2], [1, 3]], isHidden: true },
    ],
  },
  {
    slug: "ip-count-vowels",
    title: "Count Vowels",
    difficulty: "easy",
    description: "Return the number of vowels (`a e i o u`) in the lowercase string `s`.",
    functionName: "countVowels",
    params: [{ name: "s", type: "string" }],
    returnType: "int",
    ref: (s: string) => (s.match(/[aeiou]/g) ?? []).length,
    cases: [
      { name: "word", args: ["education"] },
      { name: "none", args: ["rhythm"] },
      { name: "empty", args: [""] },
      { name: "all", args: ["aeiou"], isHidden: true },
    ],
  },
  {
    slug: "ip-sum-array",
    title: "Sum of Array",
    difficulty: "easy",
    description: "Return the sum of all integers in `nums` (may be large — use a 64-bit return).",
    functionName: "sumArray",
    params: [{ name: "nums", type: "int[]" }],
    returnType: "long",
    ref: (nums: number[]) => nums.reduce((a, b) => a + b, 0),
    cases: [
      { name: "basic", args: [[1, 2, 3, 4, 5]] },
      { name: "negatives", args: [[-5, 5, -10, 10]] },
      { name: "empty", args: [[]] },
      { name: "large", args: [[1000000, 2000000, 3000000]], isHidden: true },
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

    const tags = ["dsa", ...DSA_LANGS];

    // Upsert the parent Challenge by slug. Legacy frontend fields are set to
    // inert placeholders — harness challenges drive everything off the step.
    const challenge = await prisma.challenge.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        category: "DSA",
        tags: JSON.stringify(tags),
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
        estimatedMinutes: 20,
        published: true,
        visibility: "public",
      },
      select: { id: true },
    });

    // Upsert the single harness step at position 0.
    await prisma.challengeStep.upsert({
      where: { challengeId_position: { challengeId: challenge.id, position: 0 } },
      update: {
        description: p.description,
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
        estimatedMinutes: 20,
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
  console.log(`\nSeeded ${created} harness DSA challenges.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
