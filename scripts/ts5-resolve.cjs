/**
 * Makes `require("typescript")` resolve to TypeScript 5.x, for linting only.
 *
 * WHY
 * ---
 * The app is on TypeScript 7, which is the native (Go) port. `typescript-eslint`
 * refuses to load against it — its entry point does
 *
 *     const ts = require("typescript");
 *     if (Number(ts.versionMajorMinor.split(".")[0]) >= 7) throw ...
 *
 * so *every* ESLint invocation dies with "typescript-eslint does not support
 * TS 7.0." before a single file is linted.
 *
 * TypeScript 5.9.3 is installed alongside under the `typescript-5` alias
 * (`"typescript-5": "npm:typescript@5.9.3"`). Preloading this file redirects
 * TypeScript resolution to that copy, so ESLint type-aware rules run against a
 * supported compiler while `tsc` and the app keep using TS 7.
 *
 * Only ESLint sees this — it is preloaded by `scripts/lint.cjs`, never by the
 * app, the build, or `tsc`.
 *
 * REMOVE THIS once typescript-eslint supports TS 7:
 *   https://github.com/typescript-eslint/typescript-eslint/issues/10940
 * Then drop the `typescript-5` devDependency and point `npm run lint` back at
 * plain `eslint`.
 */
const Module = require("node:module");

const ALIAS = "typescript-5";
const originalResolve = Module._resolveFilename;

Module._resolveFilename = function patchedResolve(request, ...rest) {
  // "typescript" and deep paths like "typescript/lib/tsserverlibrary".
  if (request === "typescript" || request.startsWith("typescript/")) {
    const redirected = ALIAS + request.slice("typescript".length);
    try {
      return originalResolve.call(this, redirected, ...rest);
    } catch {
      // Fall through to the real package rather than break resolution outright.
    }
  }
  return originalResolve.call(this, request, ...rest);
};
