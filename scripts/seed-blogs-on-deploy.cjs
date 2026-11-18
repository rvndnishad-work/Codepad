/**
 * Publishes new staff blog posts (prisma/data/blog/*.md) during a production
 * build, so a post pushed to main goes live with the deploy.
 *
 * Runs from `npm run build`, after `prisma migrate deploy`.
 *
 * - Only runs on production builds (VERCEL_ENV=production), or anywhere with
 *   BLOG_SEED_ON_BUILD=1. Preview and local builds skip it, so posts on
 *   unmerged branches never reach the live database.
 * - Insert-only: a slug already in the database is left alone, so admin edits,
 *   unpublished posts, views and publish dates are never overwritten. To push
 *   edits of an existing post, run `npm run seed:blogs -- <slug>` by hand.
 * - Never fails the build: a missing author or a database error is logged as
 *   a warning and the deploy carries on.
 *
 * Plain CommonJS on purpose: it runs with `node`, no TypeScript runner needed.
 * The front matter rules match prisma/blog-posts.ts, which check:blogs uses.
 */
const { readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");

const BLOG_DIR = join(__dirname, "..", "prisma", "data", "blog");

function parsePost(file, raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(raw);
  if (!match) throw new Error(`${file}: missing front matter block`);
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const i = line.indexOf(":");
    if (i < 0) throw new Error(`${file}: bad front matter line "${line}"`);
    const value = line.slice(i + 1).trim();
    meta[line.slice(0, i).trim()] = value.startsWith("[") || value.startsWith('"') ? JSON.parse(value) : value;
  }
  if (!meta.slug || !meta.title || !meta.excerpt || !Array.isArray(meta.tags)) {
    throw new Error(`${file}: slug, title, excerpt and tags are required`);
  }
  return {
    slug: meta.slug,
    title: meta.title,
    excerpt: meta.excerpt,
    tags: meta.tags,
    cover: typeof meta.cover === "string" ? meta.cover : null,
    content: raw.slice(match[0].length).trim() + "\n",
  };
}

async function main() {
  if (process.env.VERCEL_ENV !== "production" && process.env.BLOG_SEED_ON_BUILD !== "1") {
    console.log("[blog seed] Skipped: not a production build.");
    return;
  }

  const posts = readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => parsePost(f, readFileSync(join(BLOG_DIR, f), "utf8")));

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.blogPost.findMany({
      where: { slug: { in: posts.map((p) => p.slug) } },
      select: { slug: true },
    });
    const have = new Set(existing.map((p) => p.slug));
    const fresh = posts.filter((p) => !have.has(p.slug));
    if (fresh.length === 0) {
      console.log(`[blog seed] All ${posts.length} posts are already published.`);
      return;
    }

    const emails = [process.env.BLOG_AUTHOR_EMAIL, ...(process.env.ADMIN_EMAILS || "").split(",")]
      .map((e) => (e || "").trim().toLowerCase())
      .filter(Boolean);
    let author = null;
    for (const email of emails) {
      author = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true },
      });
      if (author) break;
    }
    if (!author) {
      console.warn(
        `[blog seed] Warning: ${fresh.length} new post(s) not published. ` +
          "Set BLOG_AUTHOR_EMAIL (or ADMIN_EMAILS) to the email of an existing account.",
      );
      return;
    }

    for (const p of fresh) {
      await prisma.blogPost.create({
        data: {
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          content: p.content,
          tags: JSON.stringify(p.tags),
          coverImage: p.cover,
          published: true,
          status: "PUBLISHED",
          publishedAt: new Date(),
          userId: author.id,
        },
      });
      console.log(`[blog seed] New: /blog/${p.slug}`);
    }
    console.log(`[blog seed] Published ${fresh.length} new post(s); ${have.size} already existed.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.warn("[blog seed] Warning: skipped because of an error, the deploy continues.", err);
});
