/**
 * One look for every code panel on the question page: examples, multi-file
 * solutions and the in-page runners.
 */
export const frame = "overflow-hidden rounded-2xl border border-border bg-surface";
export const frameBar = "flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border px-3 py-2 sm:px-4";
export const frameLabel = "min-w-0 truncate text-sm font-medium text-fg";
export const badge =
  "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-border bg-panel px-2 text-xs font-medium text-muted";
export const quietBtn =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-medium text-muted transition-colors hover:border-border-strong hover:bg-panel hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none";
export const iconBtn =
  "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-panel hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none";
export const runBtn =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-accent-ink transition-[filter,transform] hover:brightness-95 active:translate-y-px disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none";
/** Dark on purpose: the highlight theme is github-dark. */
export const codeArea =
  "iq-hl qa-code-scroll m-0 overflow-x-auto bg-[#0b0d12] px-4 py-4 font-mono text-[13.5px] leading-[1.7] text-muted sm:px-5";

/** Brand colour for a language or framework dot. */
export const LANG_COLOR: Record<string, string> = {
  javascript: "#f7df1e",
  js: "#f7df1e",
  node: "#5fa04e",
  typescript: "#3178c6",
  ts: "#3178c6",
  python: "#3776ab",
  py: "#3776ab",
  react: "#61dafb",
  vue: "#42b883",
  angular: "#dd0031",
  svelte: "#ff3e00",
  solid: "#446b9e",
  go: "#00add8",
  java: "#f89820",
  cpp: "#659ad2",
  rust: "#dea584",
  sql: "#38bdf8",
};
