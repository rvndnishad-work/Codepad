/**
 * Pure helpers for reading a question page: reading time, heading anchors
 * for the answer's "On this page" list, and inline code in titles.
 */

/** Words a developer reads per minute in a technical answer. */
const WORDS_PER_MINUTE = 220;

/** Markdown (with the occasional raw HTML or SVG diagram) reduced to its words. */
export function plainText(md: string): string {
  return md
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/```[\w-]*|```/g, " ")
    .replace(/[#>*_`|~[\]()-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Whole minutes to read, never less than one. */
export function readingMinutes(md: string | null | undefined): number {
  if (!md) return 1;
  const words = plainText(md).split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** Heading text as it reads on the page: no inline code tags, backticks or emphasis. */
export function headingText(raw: string): string {
  return raw
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<\/?code>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_]/g, "")
    .replace(/\s+#+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** URL-safe anchor for a heading. */
export function headingSlug(text: string): string {
  const slug = headingText(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

/** Returns a slug function that suffixes repeats (-2, -3) so every anchor is unique. */
export function createSlugger(): (text: string) => string {
  const seen = new Map<string, number>();
  return (text) => {
    const base = headingSlug(text);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  };
}

export type Heading = { id: string; text: string };

/**
 * The answer's level-two headings, in order, with the same ids the renderer
 * gives them. Headings inside fenced code blocks are ignored.
 */
export function extractHeadings(md: string | null | undefined): Heading[] {
  if (!md) return [];
  const slug = createSlugger();
  const out: Heading[] = [];
  let fenced = false;
  for (const line of md.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    // Level three still takes a slug so the ids stay in step with the renderer.
    const id = slug(m[2]);
    if (m[1].length === 2) out.push({ id, text: headingText(m[2]) });
  }
  return out;
}

export type TitlePart = { text: string; code: boolean };

/** Splits a title on backticks so `react-dom` can render as code. */
export function titleParts(title: string): TitlePart[] {
  const parts = title.split("`");
  // An unmatched backtick is just a character.
  if (parts.length % 2 === 0) return [{ text: title, code: false }];
  return parts
    .map((text, i) => ({ text, code: i % 2 === 1 }))
    .filter((p) => p.text.length > 0);
}
