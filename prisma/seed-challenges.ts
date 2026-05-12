/**
 * Seed script for coding challenges.
 *
 * Run with: npx tsx prisma/seed-challenges.ts
 *
 * Idempotent: uses upsert by slug.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ChallengeSeed = {
  slug: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  template: string;
  starterFiles: Record<string, string>;
  testFiles: Record<string, string>;
  tags: string[];
  estimatedMinutes: number;
  category: string;
};

const challenges: ChallengeSeed[] = [
  {
    slug: "fizzbuzz",
    title: "FizzBuzz",
    description: `## FizzBuzz

Write a function \`fizzBuzz(n)\` that returns an array of strings from 1 to \`n\`:

- For multiples of **3**, return \`"Fizz"\` instead of the number.
- For multiples of **5**, return \`"Buzz"\` instead of the number.
- For multiples of **both 3 and 5**, return \`"FizzBuzz"\`.
- Otherwise, return the number as a string.

### Example

\`\`\`js
fizzBuzz(5)
// => ["1", "2", "Fizz", "4", "Buzz"]
\`\`\`

### Notes
- Return type is always \`string[]\`.
- \`n\` will be a positive integer.`,
    difficulty: "easy",
    template: "test-ts",
    tags: ["arrays", "loops", "warm-up"],
    estimatedMinutes: 10,
    category: "Algorithms",
    starterFiles: {
      "/index.ts": `export function fizzBuzz(n: number): string[] {
  // TODO: implement
  return [];
}
`,
    },
    testFiles: {
      "/index.test.ts": `import { fizzBuzz } from "./index";

describe("fizzBuzz", () => {
  it("returns numbers as strings when not divisible by 3 or 5", () => {
    expect(fizzBuzz(2)).toEqual(["1", "2"]);
  });

  it("returns Fizz for multiples of 3", () => {
    const result = fizzBuzz(3);
    expect(result[2]).toBe("Fizz");
  });

  it("returns Buzz for multiples of 5", () => {
    const result = fizzBuzz(5);
    expect(result[4]).toBe("Buzz");
  });

  it("returns FizzBuzz for multiples of 15", () => {
    const result = fizzBuzz(15);
    expect(result[14]).toBe("FizzBuzz");
  });

  it("works for n = 15", () => {
    expect(fizzBuzz(15)).toEqual([
      "1", "2", "Fizz", "4", "Buzz",
      "Fizz", "7", "8", "Fizz", "Buzz",
      "11", "Fizz", "13", "14", "FizzBuzz",
    ]);
  });
});
`,
    },
  },
  {
    slug: "two-sum",
    title: "Two Sum",
    description: `## Two Sum

Given an array of integers \`nums\` and an integer \`target\`, return the **indices** of the two numbers such that they add up to \`target\`.

You may assume that each input has **exactly one solution**, and you may not use the same element twice.

### Example

\`\`\`js
twoSum([2, 7, 11, 15], 9)
// => [0, 1]   (because nums[0] + nums[1] === 9)
\`\`\`

### Notes
- The order of the returned indices doesn't matter.
- Aim for **O(n)** time.`,
    difficulty: "easy",
    template: "test-ts",
    tags: ["arrays", "hashmap"],
    estimatedMinutes: 15,
    category: "Algorithms",
    starterFiles: {
      "/index.ts": `export function twoSum(nums: number[], target: number): number[] {
  // TODO: implement
  return [];
}
`,
    },
    testFiles: {
      "/index.test.ts": `import { twoSum } from "./index";

function sorted(a: number[]): number[] {
  return [...a].sort((x, y) => x - y);
}

describe("twoSum", () => {
  it("finds the two indices for a basic case", () => {
    expect(sorted(twoSum([2, 7, 11, 15], 9))).toEqual([0, 1]);
  });

  it("works for indices not at the start", () => {
    expect(sorted(twoSum([3, 2, 4], 6))).toEqual([1, 2]);
  });

  it("works for duplicates", () => {
    expect(sorted(twoSum([3, 3], 6))).toEqual([0, 1]);
  });

  it("works with negative numbers", () => {
    expect(sorted(twoSum([-1, -2, -3, -4, -5], -8))).toEqual([2, 4]);
  });
});
`,
    },
  },
  {
    slug: "debounce",
    title: "Implement debounce",
    description: `## Implement \`debounce\`

Implement a function \`debounce(fn, wait)\` that returns a debounced version of \`fn\`. The debounced function:

1. Delays invoking \`fn\` until \`wait\` milliseconds have elapsed since the last call.
2. If called again before \`wait\` elapses, it resets the timer.
3. Is called with the **most recent** arguments.

### Example

\`\`\`js
const d = debounce(() => console.log("hi"), 100);
d(); d(); d();
// "hi" logs once, ~100ms after the third call.
\`\`\`

### Notes
- Tests use fake timers — your implementation must use \`setTimeout\` (not \`requestAnimationFrame\`).
- \`this\` context: tests don't assert \`this\` binding; any reasonable behaviour is fine.`,
    difficulty: "medium",
    template: "test-ts",
    tags: ["closures", "timing", "frontend"],
    estimatedMinutes: 20,
    category: "JavaScript",
    starterFiles: {
      "/index.ts": `export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number
): (...args: A) => void {
  // TODO: implement
  return (..._args: A) => {};
}
`,
    },
    testFiles: {
      "/index.test.ts": `import { debounce } from "./index";

describe("debounce", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("delays invocation until wait elapses", () => {
    const spy = jest.fn();
    const d = debounce(spy, 100);
    d();
    expect(spy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(99);
    expect(spy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("resets the timer on each call", () => {
    const spy = jest.fn();
    const d = debounce(spy, 100);
    d();
    jest.advanceTimersByTime(50);
    d();
    jest.advanceTimersByTime(50);
    expect(spy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(50);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("uses the most recent arguments", () => {
    const spy = jest.fn();
    const d = debounce(spy, 100);
    d(1, 2);
    d(3, 4);
    jest.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledWith(3, 4);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
`,
    },
  },
  {
    slug: "flatten-array",
    title: "Flatten Nested Array",
    description: `## Flatten Nested Array

Write a function \`flatten(arr)\` that takes a deeply nested array of numbers and returns a single flat array.

### Example

\`\`\`js
flatten([1, [2, [3, [4]], 5]])
// => [1, 2, 3, 4, 5]
\`\`\`

### Notes
- Do **not** use \`Array.prototype.flat(Infinity)\` — implement it yourself.
- Input only contains numbers and nested arrays of numbers.`,
    difficulty: "easy",
    template: "test-ts",
    tags: ["recursion", "arrays"],
    estimatedMinutes: 10,
    category: "Algorithms",
    starterFiles: {
      "/index.ts": `type Nested = number | Nested[];

export function flatten(arr: Nested[]): number[] {
  // TODO: implement (no Array.prototype.flat)
  return [];
}
`,
    },
    testFiles: {
      "/index.test.ts": `import { flatten } from "./index";

describe("flatten", () => {
  it("returns a flat array unchanged", () => {
    expect(flatten([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("flattens one level", () => {
    expect(flatten([1, [2, 3], 4])).toEqual([1, 2, 3, 4]);
  });

  it("flattens deeply nested arrays", () => {
    expect(flatten([1, [2, [3, [4, [5]]]]])).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns an empty array for an empty input", () => {
    expect(flatten([])).toEqual([]);
  });

  it("handles arrays containing only empty arrays", () => {
    expect(flatten([[], [[], []]])).toEqual([]);
  });
});
`,
    },
  },
  {
    slug: "reverse-linked-list",
    title: "Reverse a Singly Linked List",
    description: `## Reverse a Singly Linked List

Given the head of a singly linked list, reverse it and return the new head.

A node is defined as:

\`\`\`ts
class ListNode {
  val: number;
  next: ListNode | null;
}
\`\`\`

### Example

\`\`\`text
Input:  1 -> 2 -> 3 -> null
Output: 3 -> 2 -> 1 -> null
\`\`\`

### Notes
- Solve in-place if possible.
- Handle empty lists (\`null\` head) gracefully.`,
    difficulty: "medium",
    template: "test-ts",
    tags: ["linked-list", "pointers"],
    estimatedMinutes: 20,
    category: "Algorithms",
    starterFiles: {
      "/index.ts": `export class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val: number, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}

export function reverseList(head: ListNode | null): ListNode | null {
  // TODO: implement
  return head;
}
`,
    },
    testFiles: {
      "/index.test.ts": `import { ListNode, reverseList } from "./index";

function fromArray(arr: number[]): ListNode | null {
  let head: ListNode | null = null;
  for (let i = arr.length - 1; i >= 0; i--) head = new ListNode(arr[i], head);
  return head;
}

function toArray(head: ListNode | null): number[] {
  const out: number[] = [];
  let cur = head;
  while (cur) {
    out.push(cur.val);
    cur = cur.next;
  }
  return out;
}

describe("reverseList", () => {
  it("reverses a typical list", () => {
    expect(toArray(reverseList(fromArray([1, 2, 3, 4])))).toEqual([4, 3, 2, 1]);
  });

  it("returns null for an empty list", () => {
    expect(reverseList(null)).toBeNull();
  });

  it("returns the same node for a single-element list", () => {
    const head = new ListNode(7);
    const reversed = reverseList(head);
    expect(toArray(reversed)).toEqual([7]);
  });

  it("works for two elements", () => {
    expect(toArray(reverseList(fromArray([1, 2])))).toEqual([2, 1]);
  });
});
`,
    },
  },
];

async function main() {
  for (const c of challenges) {
    await prisma.challenge.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        title: c.title,
        description: c.description,
        difficulty: c.difficulty,
        template: c.template,
        starterFiles: JSON.stringify(c.starterFiles),
        testFiles: JSON.stringify(c.testFiles),
        tags: JSON.stringify(c.tags),
        estimatedMinutes: c.estimatedMinutes,
        category: c.category,
        published: true,
      },
      update: {
        title: c.title,
        description: c.description,
        difficulty: c.difficulty,
        template: c.template,
        starterFiles: JSON.stringify(c.starterFiles),
        testFiles: JSON.stringify(c.testFiles),
        tags: JSON.stringify(c.tags),
        estimatedMinutes: c.estimatedMinutes,
        category: c.category,
      },
    });
    console.log(`✓ ${c.slug}`);
  }
  console.log(`Seeded ${challenges.length} challenges.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
