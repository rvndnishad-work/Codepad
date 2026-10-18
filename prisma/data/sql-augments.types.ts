export type SqlVariant = {
  tech: string;
  code: string;
  label?: string;
  runnable?: boolean;
};

export type SqlExample = {
  label?: string;
  code?: string;
  tech?: string;
  runnable?: boolean;
  variants?: SqlVariant[];
};

export type SqlAugment = {
  title: string;
  description?: string;
  answer?: string;
  examples?: SqlExample[];
};


/**
 * "Ultra" entries: prisma/data/sql-augments-ultra-NN.ts, applied by
 * prisma/augment-sql.ts after the legacy files (ultra wins for a title).
 * The page seeds an in-memory sql.js (SQLite) database from every ```sql block
 * of `description`, then runs the example. scripts/verify-sql-examples.ts runs
 * the same steps and checks that the answer quotes the result.
 */
export type SqlUltraExample = {
  label: string;
  code: string;
  /** false + dialect "postgres": shown as code, verified on PostgreSQL 16 instead of in the page. */
  runnable?: boolean;
  dialect?: "postgres";
};

export type SqlUltraAugment = {
  title: string;
  difficulty?: "easy" | "medium" | "hard";
  /** Plain sentence, max 155 chars. */
  seoDescription: string;
  /** Question Body (CLAUDE.md §6) plus the ```sql schema block the page seeds from. Plain markdown, no HTML. */
  description: string;
  answer: string;
  examples: SqlUltraExample[];
};
