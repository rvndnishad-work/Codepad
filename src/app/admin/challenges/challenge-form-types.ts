// Types + pure helpers for ChallengeForm that need to be importable from
// both server components (the create/edit page wrappers) and client code
// (the form itself). Pulled out of ChallengeForm.tsx because that file is
// "use client" — server components can't call functions exported from a
// client module.

export type TestCaseInput = {
  id: string;
  name: string;
  input: string;
  expected: string;
  isHidden: boolean;
  weight: number;
};

export type ChallengeStepInput = {
  title: string;
  description: string;
  template: string;
  starterFilesJson: string;
  testFilesJson: string;
  estimatedMinutes: number;
  hint: string;
  videoUrl: string;
  testCases: TestCaseInput[];
};

export type ChallengeFormInput = {
  id?: string;
  slug: string;
  title: string;
  /** Markdown shown on the detail page above the step list. */
  description: string;
  difficulty: "easy" | "medium" | "hard";
  tagsCsv: string;
  category: string;
  published: boolean;
  visibility: "public" | "private";
  /** Staff-pick flag — admin only. Authors can't self-feature. */
  featured: boolean;
  /** Whether the challenge requires a paid premium subscription (admin only) */
  premium: boolean;
  steps: ChallengeStepInput[];
};

export type ChallengeFormSurface = {
  redirectTo: string;
  createEndpoint: string;
  itemEndpoint: string;
  isAdmin: boolean;
};

/** Returns a fresh empty step — used when initialising a new challenge or
 *  when the user clicks "Add another question". Pure, server-safe. */
export function blankStep(): ChallengeStepInput {
  return {
    title: "",
    description: "",
    template: "test-ts",
    starterFilesJson: `{\n  "/index.ts": "export function solve() {}\\n"\n}`,
    testFilesJson: `{\n  "/index.test.ts": "import { solve } from './index';\\n\\ntest('placeholder', () => {\\n  expect(true).toBe(true);\\n});\\n"\n}`,
    estimatedMinutes: 15,
    hint: "",
    videoUrl: "",
    testCases: [],
  };
}
