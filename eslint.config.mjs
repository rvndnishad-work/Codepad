// ESLint flat config (ESLint 9 + Next 16). `next lint` was removed in Next 16,
// so `npm run lint` runs ESLint directly against this config. eslint-config-next
// 16 ships native flat configs via its subpath exports.
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      // Nested git worktrees are whole copies of the repo, with their own
      // eslint config. Linting into them double-reports every file and picks
      // up whatever config that checkout happens to have.
      ".claude/**",
      "graphify-out/**",
      "tmp/**",
      "prisma/migrations/**",
      "next-env.d.ts",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    settings: {
      // eslint-config-next sets this to "detect", which makes
      // eslint-plugin-react@7.37.5 sniff the installed React by calling
      // `context.getFilename()` — removed in ESLint 10. That throws
      // "contextOrFilename.getFilename is not a function" while *loading*
      // react/* rules, killing the whole lint run. Pinning an explicit version
      // string skips the detection path entirely.
      //
      // Keep this in step with the `react` version in package.json. Drop it
      // once eslint-plugin-react ships ESLint 10 support (latest is 7.37.5,
      // which peers only up to eslint ^9.7).
      react: { version: "19.2" },
    },
  },
  {
    // `.cjs` files are CommonJS by definition — `require` is the only way to
    // import in them, so the ESM-import rule doesn't apply.
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];

export default eslintConfig;
