import type { Contract } from "../types";
import { python } from "./python";
import { javascript } from "./javascript";
import { typescript } from "./typescript";
import { go } from "./go";
import { cpp } from "./cpp";
import { rust } from "./rust";
import { java } from "./java";

/** Per-language code generation for the function-harness judge. */
export interface LanguageHarness {
  /** Candidate-facing starter: the function signature + a TODO body. */
  genStub(c: Contract): string;
  /**
   * Code appended after the candidate's code. Reads `input.json` (a JSON array
   * of argument-tuples), calls the contract function per case, and prints the
   * JSON of each return value, one line per case. On a per-case exception it
   * prints `{"__judge_error__": "..."}` instead.
   */
  genDriver(c: Contract): string;
  /**
   * Optional text emitted at the very TOP of the assembled file, before the
   * candidate's code (e.g. TS `/// <reference lib>` directives). Not shown to
   * the candidate.
   */
  genPrelude?(c: Contract): string;
  /**
   * When true, genStub already emits a complete, runnable file with the judge
   * harness embedded (compiled languages — the candidate can freely edit
   * imports). assembleProgram then runs the candidate's file as-is and genDriver
   * is unused. When false/undefined, genStub is the function only and genDriver
   * is appended server-side (dynamic languages).
   */
  selfContained?: boolean;
}

// Registry. Phase 0 ships python + javascript; Phase 1 adds the rest.
const HARNESSES: Record<string, LanguageHarness> = {
  python,
  javascript,
  node: javascript,
  typescript,
  go,
  cpp,
  rust,
  java,
};

export function hasHarness(language: string): boolean {
  return language.toLowerCase() in HARNESSES;
}

export function getHarness(language: string): LanguageHarness {
  const h = HARNESSES[language.toLowerCase()];
  if (!h) throw new Error(`No judge harness for language "${language}"`);
  return h;
}

export function genStub(language: string, c: Contract): string {
  return getHarness(language).genStub(c);
}

/**
 * Full entry-file source. For self-contained (compiled) languages the
 * candidate's file already embeds the harness, so it runs as-is. For dynamic
 * languages it's prelude + candidate code + generated driver.
 */
export function assembleProgram(language: string, candidateCode: string, c: Contract): string {
  const h = getHarness(language);
  if (h.selfContained) return candidateCode;
  const prelude = h.genPrelude?.(c) ?? "";
  return `${prelude}${candidateCode}\n\n${h.genDriver(c)}`;
}
