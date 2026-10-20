/**
 * Checks the staff blog posts in prisma/data/blog/*.md before they are published.
 *
 * Run with: npx tsx scripts/check-blog-posts.ts            (all posts)
 *           npx tsx scripts/check-blog-posts.ts <slug>     (one post)
 *
 * For each post it checks:
 *   - the front matter (slug, title, excerpt, tags) and that no two posts share a slug
 *   - that the body has no "# " heading (the page already shows the title)
 *   - that every runnable example prints exactly the output quoted after it.
 *     A code block is run with Node when it is ```javascript-run, or ```javascript
 *     whose first line is "// Run with: node [flags] <file>". If the next code
 *     block after it is ```text, stdout must match it exactly.
 *   - that it has a cover (a PNG, so social previews work) and at least one
 *     image in the body, and that every /blog-images/... file it uses exists
 *     in public/. SVG files must not contain apostrophes (they break some
 *     renderers).
 *   - that /interview-question/<slug> and /blog/<slug> links point at rows that
 *     exist, when DATABASE_URL is set and reachable (skipped otherwise).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadBlogPosts, type BlogPostFile } from "../prisma/blog-posts";

interface Block {
  lang: string;
  code: string;
  start: number;
}

function codeBlocks(md: string): Block[] {
  const out: Block[] = [];
  const re = /^```([\w-]*)[^\n]*\n([\s\S]*?)^```[ \t]*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) out.push({ lang: m[1], code: m[2], start: m.index });
  return out;
}

function runExamples(post: BlogPostFile, errors: string[]) {
  const blocks = codeBlocks(post.content);
  const dir = mkdtempSync(join(tmpdir(), "blog-check-"));
  let ran = 0;
  try {
    blocks.forEach((b, i) => {
      const flagLine = /^\/\/ Run with: node((?:\s+--[\w-]+)*)\s+\S+/.exec(b.code.split("\n")[0]);
      const runnable = b.lang === "javascript-run" || (b.lang === "javascript" && flagLine);
      if (!runnable) return;
      const next = blocks[i + 1];
      const expected = next && next.lang === "text" ? next.code : null;
      const file = join(dir, `example-${i}.js`);
      writeFileSync(file, b.code);
      const flags = flagLine?.[1]?.trim().split(/\s+/).filter(Boolean) ?? [];
      let stdout: string;
      try {
        stdout = execFileSync(process.execPath, [...flags, file], { encoding: "utf8", timeout: 60_000 });
      } catch (err) {
        errors.push(`example ${i + 1} threw: ${(err as Error).message.split("\n").slice(0, 3).join(" ")}`);
        return;
      }
      ran++;
      if (expected === null) {
        errors.push(`example ${i + 1} runs but has no \`\`\`text output block after it`);
      } else if (stdout.trimEnd() !== expected.trimEnd()) {
        errors.push(`example ${i + 1} output differs.\n--- printed\n${stdout.trimEnd()}\n--- quoted\n${expected.trimEnd()}`);
      }
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return ran;
}

function checkImages(post: BlogPostFile, errors: string[]) {
  const publicPath = (src: string) => join(process.cwd(), "public", ...src.split("/").filter(Boolean));
  if (!post.cover) errors.push("needs a cover: /blog-images/<slug>/cover.png in the front matter");
  else if (!post.cover.endsWith(".png")) errors.push("cover must be a .png (render cover.svg with scripts/render-blog-cover.ts)");
  const body = post.content.replace(/^```[\s\S]*?^```/gm, "");
  const images = [...body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)\)/g)].map((m) => ({ alt: m[1], src: m[2] }));
  if (images.length === 0) errors.push("needs at least one diagram or image in the body");
  for (const img of images) if (!img.alt.trim()) errors.push(`image ${img.src} needs alt text (it is shown as the caption)`);
  const local = [post.cover, ...images.map((i) => i.src)].filter((s): s is string => !!s && s.startsWith("/"));
  for (const src of new Set(local)) {
    if (!src.startsWith(`/blog-images/${post.slug}/`)) {
      errors.push(`${src}: local images go in /blog-images/${post.slug}/`);
      continue;
    }
    const file = publicPath(src);
    if (!existsSync(file)) errors.push(`missing image public${src}`);
    else if (src.endsWith(".svg") && readFileSync(file, "utf8").includes("'")) errors.push(`${src} contains an apostrophe`);
  }
  for (const img of images) {
    if (!img.src.startsWith("/") && !/^https:\/\/(images\.unsplash\.com|images\.pexels\.com)\//.test(img.src)) {
      errors.push(`${img.src}: remote images must come from images.unsplash.com or images.pexels.com`);
    }
  }
}

async function checkLinks(posts: BlogPostFile[], errorsBySlug: Map<string, string[]>) {
  if (!process.env.DATABASE_URL) {
    console.log("Links: skipped (DATABASE_URL not set).");
    return;
  }
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    for (const p of posts) {
      const errors = errorsBySlug.get(p.slug)!;
      const iq = [...p.content.matchAll(/\]\(\/interview-question\/([a-z0-9-]+)\)/g)].map((m) => m[1]);
      const blog = [...p.content.matchAll(/\]\(\/blog\/([a-z0-9-]+)\)/g)].map((m) => m[1]);
      const ownSlugs = new Set(posts.map((x) => x.slug));
      for (const slug of new Set(iq)) {
        const found = await prisma.prepQuestion.findFirst({ where: { slug }, select: { id: true } });
        if (!found) errors.push(`dead link /interview-question/${slug}`);
      }
      for (const slug of new Set(blog)) {
        if (ownSlugs.has(slug)) continue;
        const found = await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } });
        if (!found) errors.push(`dead link /blog/${slug}`);
      }
    }
  } catch (err) {
    console.log(`Links: skipped (database not reachable: ${(err as Error).message.split("\n")[0]}).`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const all = loadBlogPosts();
  const posts = process.argv[2] ? all.filter((p) => p.slug === process.argv[2] || p.file === process.argv[2]) : all;
  if (posts.length === 0) {
    console.error(`No post named ${process.argv[2]} in prisma/data/blog.`);
    process.exit(1);
  }

  const errorsBySlug = new Map<string, string[]>();
  const seen = new Map<string, string>();
  for (const p of all) {
    if (seen.has(p.slug)) console.error(`Duplicate slug ${p.slug} in ${seen.get(p.slug)} and ${p.file}`);
    seen.set(p.slug, p.file);
  }
  const duplicate = all.length !== seen.size;

  for (const p of posts) {
    const errors: string[] = [];
    errorsBySlug.set(p.slug, errors);
    if (/^# /m.test(p.content.replace(/^```[\s\S]*?^```/gm, ""))) {
      errors.push('uses a "# " heading; the page already shows the title, start sections at "## "');
    }
    checkImages(p, errors);
    const ran = runExamples(p, errors);
    console.log(`${p.file}: ran ${ran} example(s)`);
  }
  await checkLinks(posts, errorsBySlug);

  let failed = duplicate;
  for (const [slug, errors] of errorsBySlug) {
    for (const e of errors) console.error(`✖ ${slug}: ${e}`);
    if (errors.length) failed = true;
  }
  if (failed) process.exit(1);
  console.log(`✔ ${posts.length} post(s) passed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
