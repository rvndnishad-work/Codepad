// Pre-built starter + test pairs the author can drop into a step.
//
// Why: authors who aren't experienced with Jest spend a lot of time fighting
// the boilerplate — `describe` blocks, `test` vs `it`, `toBe` vs `toEqual`,
// async syntax, etc. Picking a template means the *structure* is correct and
// they just fill in concrete test cases.
//
// Each template targets a Sandpack template (`test-ts`, `test-js`, etc.) and
// pre-populates description + starter + test files. Picking one replaces the
// active step's content (after confirming if any of those fields are
// non-default).
//
// To add a new template, append to TEMPLATES and the picker UI will surface
// it automatically.

export type ChallengeTemplate = {
  /** Stable id used for the picker. */
  id: string;
  /** Human-readable name in the dropdown. */
  name: string;
  /** One-line teaser shown under the name. */
  blurb: string;
  /** Sandpack template id the starter targets. */
  template: string;
  /** Markdown description for the step. */
  description: string;
  /** {"/path": "code"} — visible starter files for the participant. */
  starterFiles: Record<string, string>;
  /** {"/path": "code"} — hidden Jest test files. */
  testFiles: Record<string, string>;
};

export const TEMPLATES: ChallengeTemplate[] = [
  {
    id: "function-value-ts",
    name: "Function → value (TypeScript)",
    blurb: "Function takes args and returns a primitive. Most common shape.",
    template: "test-ts",
    description: `## Problem

Write \`solve(input)\` that returns a value.

### Examples

\`\`\`
solve(2)  // => 4
solve(3)  // => 9
\`\`\`

### Notes
- Input is always a positive integer.
- Aim for O(1) time.`,
    starterFiles: {
      "/index.ts": `export function solve(input: number): number {
  // TODO: implement
  return 0;
}
`,
    },
    testFiles: {
      "/index.test.ts": `import { solve } from "./index";

describe("solve", () => {
  test("returns the square for 2", () => {
    expect(solve(2)).toBe(4);
  });

  test("returns the square for 3", () => {
    expect(solve(3)).toBe(9);
  });

  test("handles 1 (edge case)", () => {
    expect(solve(1)).toBe(1);
  });
});
`,
    },
  },

  {
    id: "function-array-ts",
    name: "Function → array (TypeScript)",
    blurb: "Function transforms input and returns an array. Use toEqual.",
    template: "test-ts",
    description: `## Problem

Write \`transform(arr)\` that returns a new array.

### Examples

\`\`\`
transform([1, 2, 3])     // => [2, 4, 6]
transform([])            // => []
\`\`\`

### Notes
- Do not mutate the input array.`,
    starterFiles: {
      "/index.ts": `export function transform(arr: number[]): number[] {
  // TODO: implement
  return [];
}
`,
    },
    testFiles: {
      "/index.test.ts": `import { transform } from "./index";

describe("transform", () => {
  test("doubles every element", () => {
    expect(transform([1, 2, 3])).toEqual([2, 4, 6]);
  });

  test("returns an empty array for empty input", () => {
    expect(transform([])).toEqual([]);
  });

  test("does not mutate the input", () => {
    const input = [1, 2, 3];
    transform(input);
    expect(input).toEqual([1, 2, 3]);
  });
});
`,
    },
  },

  {
    id: "function-multi-arg-ts",
    name: "Function with multiple args (TypeScript)",
    blurb: "Two or more parameters, single return. Great for math / parsing.",
    template: "test-ts",
    description: `## Problem

Implement \`compute(a, b)\` returning a derived value.

### Examples

\`\`\`
compute(2, 3)   // => 5
compute(-1, 1)  // => 0
\`\`\``,
    starterFiles: {
      "/index.ts": `export function compute(a: number, b: number): number {
  // TODO: implement
  return 0;
}
`,
    },
    testFiles: {
      "/index.test.ts": `import { compute } from "./index";

describe("compute", () => {
  test("adds two positives", () => {
    expect(compute(2, 3)).toBe(5);
  });

  test("handles negatives", () => {
    expect(compute(-1, 1)).toBe(0);
  });

  test("handles zero", () => {
    expect(compute(0, 0)).toBe(0);
  });
});
`,
    },
  },

  {
    id: "class-ts",
    name: "Class with methods (TypeScript)",
    blurb: "Construct an instance, exercise methods, assert internal state.",
    template: "test-ts",
    description: `## Problem

Implement a class \`Counter\` with:
- \`increment()\` — adds 1
- \`reset()\` — sets count back to 0
- \`value\` — read-only current count`,
    starterFiles: {
      "/index.ts": `export class Counter {
  // TODO: track count internally
  constructor() {}

  increment(): void {
    // TODO
  }

  reset(): void {
    // TODO
  }

  get value(): number {
    // TODO
    return 0;
  }
}
`,
    },
    testFiles: {
      "/index.test.ts": `import { Counter } from "./index";

describe("Counter", () => {
  test("starts at 0", () => {
    const c = new Counter();
    expect(c.value).toBe(0);
  });

  test("increment advances the count", () => {
    const c = new Counter();
    c.increment();
    c.increment();
    expect(c.value).toBe(2);
  });

  test("reset returns to 0", () => {
    const c = new Counter();
    c.increment();
    c.reset();
    expect(c.value).toBe(0);
  });
});
`,
    },
  },

  {
    id: "async-ts",
    name: "Async function (TypeScript)",
    blurb: "Function returns a Promise. Uses await + .resolves / .rejects.",
    template: "test-ts",
    description: `## Problem

Implement \`fetchUser(id)\` that resolves with \`{ id, name }\` or rejects on a bad id.`,
    starterFiles: {
      "/index.ts": `export type User = { id: number; name: string };

export async function fetchUser(id: number): Promise<User> {
  // TODO: implement
  throw new Error("not implemented");
}
`,
    },
    testFiles: {
      "/index.test.ts": `import { fetchUser } from "./index";

describe("fetchUser", () => {
  test("resolves with the user", async () => {
    await expect(fetchUser(1)).resolves.toEqual({ id: 1, name: expect.any(String) });
  });

  test("rejects for non-positive ids", async () => {
    await expect(fetchUser(0)).rejects.toBeInstanceOf(Error);
  });
});
`,
    },
  },

  {
    id: "function-value-js",
    name: "Function → value (JavaScript)",
    blurb: "Same as TS version but vanilla JS — for beginners.",
    template: "test-js",
    description: `## Problem

Write \`solve(input)\` that returns a value.

### Examples

\`\`\`
solve(2)  // => 4
solve(3)  // => 9
\`\`\``,
    starterFiles: {
      "/index.js": `export function solve(input) {
  // TODO: implement
  return 0;
}
`,
    },
    testFiles: {
      "/index.test.js": `import { solve } from "./index";

describe("solve", () => {
  test("returns the square for 2", () => {
    expect(solve(2)).toBe(4);
  });

  test("returns the square for 3", () => {
    expect(solve(3)).toBe(9);
  });

  test("handles 1 (edge case)", () => {
    expect(solve(1)).toBe(1);
  });
});
`,
    },
  },


];
