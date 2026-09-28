/**
 * Stacks the interview room's code editor offers: the same playable
 * templates as /playgrounds, grouped for the interviewer's picker, plus
 * what each one shows beside the editor. Pure and free of template
 * contents, so the switchboard (tools.ts) can validate a stack id without
 * loading the starter files.
 */

export type CodeStackGroup = { key: string; label: string; ids: readonly string[] };

/** Picker order. Every id is a template in src/lib/templates.ts (unit tested). */
export const CODE_STACK_GROUPS: readonly CodeStackGroup[] = [
  { key: "languages", label: "Languages", ids: ["python", "node", "ts-node", "javascript", "typescript", "go", "java", "cpp", "rust"] },
  { key: "frontend", label: "Frontend frameworks", ids: ["react", "vue", "angular", "svelte", "solid"] },
  { key: "react", label: "React libraries", ids: ["react-hooks", "redux-toolkit", "mobx", "framer-motion", "mui", "react-classes"] },
  { key: "blank", label: "Blank starters", ids: ["empty-js", "empty-ts", "empty-react", "empty-vue", "empty-angular", "empty-svelte", "empty-solid"] },
];

export const CODE_STACK_IDS: readonly string[] = CODE_STACK_GROUPS.flatMap((g) => g.ids);

export function isCodeStack(v: unknown): v is string {
  return typeof v === "string" && CODE_STACK_IDS.includes(v);
}

/** Stacks that run on the server (Piston) when someone presses Run. */
const SERVER_STACKS = new Set(["python", "node", "ts-node", "go", "java", "cpp", "rust"]);
/** Browser stacks with no page to show: their output is the console. */
const CONSOLE_STACKS = new Set(["empty-js", "empty-ts"]);

/**
 * What sits beside the editor:
 * - "run": a Run button and the program output (server stacks)
 * - "console": the browser console only, updated as you type
 * - "both": the live preview with a console tab
 */
export type CodeOutput = "run" | "console" | "both";

export function codeOutputFor(stack: string): CodeOutput {
  if (SERVER_STACKS.has(stack)) return "run";
  if (CONSOLE_STACKS.has(stack)) return "console";
  return "both";
}

/** Shared-document name for one file of one stack. Each stack keeps its own
 * files, so switching stacks and back returns to the earlier code. */
export function codeText(stack: string, path: string): string {
  return `code:${stack}:${path}`;
}

/** Key in the "codeRuns" shared map for the last server run of a stack
 * (not "code": older rooms have a text by that name). */
export function codeRunKey(stack: string): string {
  return `codeRun:${stack}`;
}
