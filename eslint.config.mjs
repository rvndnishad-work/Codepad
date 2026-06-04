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
      "graphify-out/**",
      "tmp/**",
      "prisma/migrations/**",
      "next-env.d.ts",
    ],
  },
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;
