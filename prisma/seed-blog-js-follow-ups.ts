/**
 * Publishes the staff blog post "The JavaScript Follow-Up Questions Senior
 * Interviews Actually Ask" from prisma/data/blog/javascript-senior-follow-up-questions.md.
 *
 * Run with: npm run seed:blog-js-follow-ups
 *
 * Author: the user whose email is BLOG_AUTHOR_EMAIL, else the first ADMIN_EMAILS
 * address that has an account. Idempotent: the slug is fixed, so re-running
 * updates the post (title, excerpt, content, tags) and keeps its views,
 * reactions, comments and original publish date.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

const SLUG = "javascript-senior-interview-follow-up-questions";
const TITLE = "The JavaScript Follow-Up Questions Senior Interviews Actually Ask";
const EXCERPT =
  "Everyone can define a closure or say \"JS is single-threaded\". These are the follow-ups where answers collapse: closure memory, garbage collection, microtasks, starvation, hidden classes, the JIT, private fields, structuredClone, ESM resolution and execution order. Each one is answered with code you can run.";
const TAGS = ["javascript", "interview", "closures", "event-loop", "v8"];

async function findAuthor() {
  const candidates = [
    process.env.BLOG_AUTHOR_EMAIL,
    ...(process.env.ADMIN_EMAILS ?? "").split(","),
  ]
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
  const content = readFileSync(
    join(__dirname, "data", "blog", "javascript-senior-follow-up-questions.md"),
    "utf8",
  );

  const author = await findAuthor();
  if (!author) {
    console.error(
      "No author found. Set BLOG_AUTHOR_EMAIL (or ADMIN_EMAILS) to the email of an existing account.",
    );
    process.exit(1);
  }

  const now = new Date();
  const post = await prisma.blogPost.upsert({
    where: { slug: SLUG },
    create: {
      slug: SLUG,
      title: TITLE,
      excerpt: EXCERPT,
      content,
      tags: JSON.stringify(TAGS),
      published: true,
      status: "PUBLISHED",
      publishedAt: now,
      userId: author.id,
    },
    update: {
      title: TITLE,
      excerpt: EXCERPT,
      content,
      tags: JSON.stringify(TAGS),
      published: true,
      status: "PUBLISHED",
    },
  });

  console.log(`Published /blog/${post.slug} as ${author.email} (${content.length} chars).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
