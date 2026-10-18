// emmet ships types at dist/index.d.ts, but its package.json "exports" map
// has no "types" condition, so `moduleResolution: "bundler"` cannot find
// them. Declare the two functions lib/emmet-abbreviation uses.
declare module "emmet" {
  export interface ExtractedAbbreviation {
    abbreviation: string;
    location: number;
    start: number;
    end: number;
  }
  export function extract(
    line: string,
    pos?: number,
    options?: { type?: "markup" | "stylesheet"; lookAhead?: boolean },
  ): ExtractedAbbreviation | undefined;
  export default function expand(
    abbr: string,
    config?: { type?: "markup" | "stylesheet"; syntax?: string; options?: Record<string, unknown> },
  ): string;
}
