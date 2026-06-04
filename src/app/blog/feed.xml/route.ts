import { prisma } from "@/lib/prisma";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const SITE_NAME = "Interviewpad";
const FEED_DESCRIPTION =
  "Articles, tutorials, and deep-dives on JavaScript, TypeScript, React, and modern web tooling from the Interviewpad community.";

export const revalidate = 600;

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

function fetchFeedPosts() {
  return prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true } } },
  });
}

export async function GET() {
  // This route prerenders at build (revalidate=600), so a cold/unreachable DB
  // at build time must NOT fail the whole deploy. On error we emit an empty
  // feed; the next on-demand revalidation (≤10 min) fills it in once the DB is
  // reachable. Runtime requests in-region are unaffected.
  let posts: Awaited<ReturnType<typeof fetchFeedPosts>> = [];
  try {
    posts = await fetchFeedPosts();
  } catch (err) {
    console.error("[blog/feed.xml] DB unavailable, serving empty feed:", err);
  }

  const lastBuildDate = (posts[0]?.updatedAt ?? new Date()).toUTCString();

  const items = posts
    .map((post) => {
      const link = `${SITE_URL}/blog/${post.slug}`;
      const pubDate = post.createdAt.toUTCString();
      const author = post.user?.name ?? "Anonymous";
      const description = post.excerpt ?? post.title;
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:creator>${escapeXml(author)}</dc:creator>
      <description>${escapeXml(description)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE_NAME)} — Blog</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600",
    },
  });
}
