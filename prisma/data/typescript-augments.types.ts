/**
 * TypeScript (technology='typescript') "ultra" entries:
 * prisma/data/typescript-augments-ultra-NN.ts, applied by prisma/augment-typescript.ts.
 *
 * Examples run in the page: TypeScript 5.4.5 `ts.transpile` (target ES2022) in
 * a browser worker, then `new Function('console', code)`. They are checked by
 * scripts/verify-ts-examples.ts (tsc --strict must pass; output is quoted).
 */
export type TsUltraExample = {
  label: string;
  code: string;
  /** false = type-checked only (needs modules, Node APIs or a tsconfig the page cannot give). */
  runnable?: boolean;
};

export type TsUltraAugment = {
  title: string;
  difficulty?: "easy" | "medium" | "hard";
  /** Plain sentence, max 155 chars. */
  seoDescription: string;
  /** Question Body (CLAUDE.md §6), plain markdown, no HTML. */
  description: string;
  answer: string;
  examples: TsUltraExample[];
};
