/**
 * One-line preview of a public bank question for the Question library.
 *
 * Bank descriptions follow the content guide's Question Body template
 * ("**Question presented to candidate:**" then the spoken question in quotes,
 * then the rubric), so a plain slice showed raw markdown and the label. Prefer
 * the spoken question; otherwise fall back to the text without markdown.
 */
export function publicSummary(description: string | null | undefined, max = 220): string | null {
  if (!description?.trim()) return null;
  const spoken = description.match(/\*\*Question presented to candidate:?\*\*:?\s*[“"]([\s\S]+?)[”"]\s*(?:\n|$)/i);
  const text = (spoken ? spoken[1] : description)
    .replace(/\*\*[^*\n]+:\*\*/g, " ") // bold labels such as "**What a strong answer should cover:**"
    .replace(/^\s*(?:#+|>)\s*/gm, "") // headings and quotes
    .replace(/[*`]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
