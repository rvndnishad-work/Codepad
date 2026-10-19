/**
 * Publishes every staff blog post in prisma/data/blog/*.md.
 *
 * Run with: npm run seed:blogs              (all posts)
 *           npm run seed:blogs -- <slug>    (one post)
 *
 * Author: the user whose email is BLOG_AUTHOR_EMAIL, else the first ADMIN_EMAILS
 * address that has an account. Idempotent: posts are matched by slug, so
 * re-running updates title, excerpt, tags, cover and content and keeps views,
 * reactions, comments and the original publish date.
 */
import { PrismaClient } from "@prisma/client";
import { loadBlogPosts } from "./blog-posts";

const prisma = new PrismaClient();

async function findAuthor() {
  const candidates = [process.env.BLOG_AUTHOR_EMAIL, ...(process.env.ADMIN_EMAILS ?? "").split(",")]
    .map((e) => e?.trim().toLowerCase())
    .filter((e): e is string => Boolean(e));
  for (const email of candidates) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true },
    });
    if (user) return user;
  }
  return null;
}

async function main() {
  const posts = loadBlogPosts(process.argv[2]);
  if (posts.length === 0) {
    console.error(process.argv[2] ? `No post named ${process.argv[2]} in prisma/data/blog.` : "No posts found.");
    process.exit(1);
  }

  const author = await findAuthor();
  if (!author) {
    console.error("No author found. Set BLOG_AUTHOR_EMAIL (or ADMIN_EMAILS) to the email of an existing account.");
    process.exit(1);
  }

  let created = 0;
  let updated = 0;
  for (const p of posts) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: p.slug }, select: { id: true } });
    const fields = {
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
      tags: JSON.stringify(p.tags),
      coverImage: p.cover ?? null,
      published: true,
      status: "PUBLISHED",
    };
    if (existing) {
      await prisma.blogPost.update({ where: { slug: p.slug }, data: fields });
      updated++;
    } else {
      await prisma.blogPost.create({ data: { ...fields, slug: p.slug, publishedAt: new Date(), userId: author.id } });
      created++;
      console.log(`New: /blog/${p.slug}`);
    }
  }
  console.log(`Published ${posts.length} post(s) as ${author.email}: ${created} new, ${updated} updated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
