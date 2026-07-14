import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { baseExtensions } from "./extensions";

/**
 * Public renderer for creator-authored bodies. Prefers the rich Tiptap JSON
 * (`bodyJson`) and falls back to the legacy markdown column, so content
 * written before the block editor keeps rendering unchanged.
 */
export default function RichContent({
  json,
  markdown,
  className = "prose prose-sm dark:prose-invert max-w-none",
}: {
  json?: unknown | null;
  markdown?: string | null;
  className?: string;
}) {
  if (json && typeof json === "object") {
    let html: string;
    try {
      html = generateHTML(json as JSONContent, baseExtensions());
    } catch (err) {
      console.error("[rich-content] render failed, falling back to markdown:", err);
      return markdown ? <MarkdownRenderer content={markdown} /> : null;
    }
    return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  if (markdown) {
    return (
      <div className={className}>
        <MarkdownRenderer content={markdown} />
      </div>
    );
  }
  return null;
}
