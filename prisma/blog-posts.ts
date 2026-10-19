/**
 * Shared loader for the staff blog posts in prisma/data/blog/*.md.
 *
 * Each post is a Markdown file that starts with a small front matter block:
 *
 *   ---
 *   slug: kebab-case-slug
 *   title: Post title
 *   excerpt: One or two sentences for cards and search results.
 *   tags: ["javascript", "react"]
 *   cover: /blog-images/kebab-case-slug/cover.png
 *   ---
 *
 * Values are plain text, except values starting with [ or " which are parsed
 * as JSON. Used by seed-blog-posts.ts (publishing) and
 * scripts/check-blog-posts.ts (validation).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const BLOG_DIR = join(__dirname, "data", "blog");

export interface BlogPostFile {
  file: string;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  /** Site path of the cover image, e.g. /blog-images/<slug>/cover.png. */
  cover?: string;
  content: string;
}

export function parseBlogPost(file: string, raw: string): BlogPostFile {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(raw);
  if (!match) throw new Error(`${file}: missing front matter block`);
  const meta: Record<string, unknown> = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const i = line.indexOf(":");
    if (i < 0) throw new Error(`${file}: bad front matter line "${line}"`);
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    meta[key] = value.startsWith("[") || value.startsWith('"') ? JSON.parse(value) : value;
  }
  const { slug, title, excerpt, tags, cover } = meta;
  if (typeof slug !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`${file}: slug must be kebab-case`);
  }
  if (typeof title !== "string" || !title) throw new Error(`${file}: title is required`);
  if (typeof excerpt !== "string" || !excerpt) throw new Error(`${file}: excerpt is required`);
  if (!Array.isArray(tags) || !tags.every((t) => typeof t === "string")) {
    throw new Error(`${file}: tags must be a JSON array of strings`);
  }
  if (cover !== undefined && (typeof cover !== "string" || !cover.startsWith("/blog-images/"))) {
    throw new Error(`${file}: cover must be a /blog-images/... path`);
  }
  const content = raw.slice(match[0].length).trim() + "\n";
  return { file, slug, title, excerpt, tags: tags as string[], cover: cover as string | undefined, content };
}

export function loadBlogPosts(only?: string): BlogPostFile[] {
  return readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .filter((f) => !only || f === only || f === `${only}.md`)
    .sort()
    .map((f) => parseBlogPost(f, readFileSync(join(BLOG_DIR, f), "utf8")));
}
