import ChallengeForm from "../ChallengeForm";

const STARTER_PLACEHOLDER = `{
  "/index.ts": "export function solve() {\\n  // TODO: implement\\n  return null;\\n}\\n"
}`;

const TEST_PLACEHOLDER = `{
  "/index.test.ts": "import { solve } from './index';\\n\\ndescribe('solve', () => {\\n  it('returns null', () => {\\n    expect(solve()).toBe(null);\\n  });\\n});\\n"
}`;

export default function NewChallengePage() {
  return (
    <ChallengeForm
      mode="create"
      initial={{
        slug: "",
        title: "",
        description: "## Problem\n\nWrite a function that...\n",
        difficulty: "easy",
        template: "test-ts",
        starterFilesJson: STARTER_PLACEHOLDER,
        testFilesJson: TEST_PLACEHOLDER,
        tagsCsv: "",
        estimatedMinutes: 15,
        category: "",
        published: false,
      }}
    />
  );
}
