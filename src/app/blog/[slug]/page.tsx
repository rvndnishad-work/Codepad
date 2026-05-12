import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { notFound } from "next/navigation";
import {
  User as UserIcon,
  Calendar,
  BookOpen,
  ArrowLeft,
  Edit3,
  Hash,
  Eye,
  Heart,
  MessageCircle,
} from "lucide-react";
import RelativeTime from "@/components/RelativeTime";
import Link from "next/link";
import FollowButton from "@/components/FollowButton";
import ReactionBar from "@/components/ReactionBar";
import BookmarkButton from "@/components/BookmarkButton";
import ShareButton from "@/components/ShareButton";
import CommentSection, { type CommentNode } from "@/components/CommentSection";
import ReadingProgress from "@/components/ReadingProgress";
import BlogEngagementRail from "@/components/BlogEngagementRail";
import AuthorFooterCard, {
  type AuthorFooterPost,
} from "@/components/AuthorFooterCard";
import RelatedPosts, { type RelatedPost } from "@/components/RelatedPosts";

function safeTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === "string")
      : [];
  } catch {
    return [];
  }
}

function readingMinutes(content: string): number {
  return Math.max(1, Math.round(content.trim().split(/\s+/).length / 200));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blog = await prisma.blogPost.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, coverImage: true, published: true },
  });
  if (!blog || !blog.published) return { title: "Story not found — Interviewpad" };
  return {
    title: `${blog.title} — Interviewpad`,
    description: blog.excerpt ?? `${blog.title} on Interviewpad.`,
    openGraph: {
      title: blog.title,
      description: blog.excerpt ?? undefined,
      images: blog.coverImage ? [blog.coverImage] : undefined,
      type: "article",
    },
    twitter: {
      card: blog.coverImage ? "summary_large_image" : "summary",
      title: blog.title,
      description: blog.excerpt ?? undefined,
      images: blog.coverImage ? [blog.coverImage] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const blog = await prisma.blogPost.findUnique({
    where: { slug },
    include: {
      user: {
        select: { id: true, name: true, image: true, bio: true },
      },
      _count: { select: { reactions: true, comments: true } },
    },
  });

  if (!blog || !blog.published) {
    notFound();
  }

  const session = await auth().catch(() => null);
  const viewerId = session?.user?.id ?? null;
  const viewerIsAdmin = isAdmin(session);
  const isAuthor = viewerId === blog.user.id;

  // Fire-and-forget view increment; skip author's own views.
  if (!isAuthor) {
    prisma.blogPost
      .update({
        where: { id: blog.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => null);
  }

  const tags = safeTags(blog.tags);

  // Viewer flags + comments + recommendations fetched in parallel.
  const [
    isFollowing,
    hasReacted,
    isBookmarked,
    commentsRaw,
    moreFromAuthorRaw,
    relatedByTagRaw,
  ] = await Promise.all([
    viewerId && viewerId !== blog.user.id
      ? prisma.follow
          .findUnique({
            where: {
              followerId_followingId: {
                followerId: viewerId,
                followingId: blog.user.id,
              },
            },
            select: { followerId: true },
          })
          .then((r) => !!r)
      : Promise.resolve(false),
    viewerId
      ? prisma.blogReaction
          .findUnique({
            where: {
              postId_userId_type: {
                postId: blog.id,
                userId: viewerId,
                type: "clap",
              },
            },
            select: { id: true },
          })
          .then((r) => !!r)
      : Promise.resolve(false),
    viewerId
      ? prisma.blogBookmark
          .findUnique({
            where: { postId_userId: { postId: blog.id, userId: viewerId } },
            select: { postId: true },
          })
          .then((r) => !!r)
      : Promise.resolve(false),
    prisma.blogComment.findMany({
      where: { postId: blog.id, parentId: null },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
      take: 200,
    }),
    prisma.blogPost.findMany({
      where: {
        userId: blog.user.id,
        published: true,
        NOT: { id: blog.id },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, slug: true, title: true, createdAt: true },
    }),
    // Related-by-tag: pull up to 12 candidates with at least one overlapping tag.
    // SQLite doesn't have native array overlap, so we LIKE-match each tag.
    tags.length > 0
      ? prisma.blogPost.findMany({
          where: {
            published: true,
            NOT: { id: blog.id },
            OR: tags.map((t) => ({ tags: { contains: `"${t}"` } })),
          },
          orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
          take: 6,
          include: { user: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const commentsList: CommentNode[] = commentsRaw.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    user: {
      id: c.user.id,
      name: c.user.name,
      image: c.user.image,
    },
  }));

  const morePosts: AuthorFooterPost[] = moreFromAuthorRaw.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    createdAt: p.createdAt.toISOString(),
  }));

  const related: RelatedPost[] = relatedByTagRaw.slice(0, 3).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    coverImage: p.coverImage,
    createdAt: p.createdAt.toISOString(),
    readingMinutes: readingMinutes(p.content),
    user: { name: p.user.name },
  }));

  const minutes = readingMinutes(blog.content);

  return (
    <article className="bg-bg min-h-screen flex flex-col">
      <ReadingProgress />

      <div className="mx-auto w-full max-w-7xl px-4 pt-8 md:pt-10">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted hover:text-accent transition mb-8 group"
        >
          <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" />
          All stories
        </Link>
      </div>

      {/* HERO */}
      <header className="relative">
        {blog.coverImage ? (
          <div className="mx-auto w-full max-w-5xl px-4">
            <div className="aspect-[2/1] w-full rounded-3xl overflow-hidden border border-border shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blog.coverImage}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ) : (
          // Subtle gradient backdrop when there's no cover image — replaces
          // the empty hero block the old layout left dangling.
          <div className="absolute inset-x-0 top-0 h-[300px] pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-accent/8 via-accent/3 to-transparent" />
            <div className="absolute -top-32 right-0 w-[480px] h-[480px] rounded-full bg-accent/10 blur-[120px]" />
          </div>
        )}

        <div className="relative mx-auto max-w-3xl px-4 pt-10 md:pt-14">
          {/* Tag chips above title */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {tags.map((t) => (
                <Link
                  key={t}
                  href={`/blog?tag=${encodeURIComponent(t)}`}
                  className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-[0.15em] bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition"
                >
                  #{t}
                </Link>
              ))}
            </div>
          )}

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] text-fg mb-4">
            {blog.title}
          </h1>

          {blog.excerpt && (
            <p className="text-lg md:text-xl text-muted leading-relaxed mb-8 max-w-2xl">
              {blog.excerpt}
            </p>
          )}

          {/* Author + meta strip */}
          <div className="flex items-center gap-3 pb-8 border-b border-border">
            <Link
              href={`/u/${blog.user.id}`}
              className="w-10 h-10 rounded-full bg-surface overflow-hidden border border-border shrink-0"
            >
              {blog.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={blog.user.image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-accent/10 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-muted" />
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                href={`/u/${blog.user.id}`}
                className="text-sm font-black text-fg hover:text-accent transition truncate block"
              >
                {blog.user.name ?? "Anonymous"}
              </Link>
              <div className="flex items-center gap-3 text-[11px] font-bold text-muted mt-0.5">
                <span className="flex items-center gap-1.5 text-blue-500/80">
                  <Calendar className="w-3.5 h-3.5" />
                  <RelativeTime iso={blog.createdAt.toISOString()} />
                </span>
                <span className="text-muted/30">·</span>
                <span className="flex items-center gap-1.5 text-emerald-500/80">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{minutes}m read</span>
                </span>
                <span className="text-muted/30">·</span>
                <span className="flex items-center gap-1.5 text-sky-500/80">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="tabular-nums">{blog.viewCount} views</span>
                </span>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              {isAuthor ? (
                <Link
                  href={`/dashboard/blogs/${blog.id}/edit`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-elevated text-fg/70 hover:text-fg text-xs font-bold transition"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit
                </Link>
              ) : (
                <FollowButton
                  userId={blog.user.id}
                  initialFollowing={isFollowing}
                  signedIn={!!viewerId}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* BODY: floating rail (lg+) + prose column */}
      <div className="relative mx-auto w-full max-w-3xl px-4 mt-10">
        <div className="hidden lg:block absolute -left-24 top-0 h-full">
          <BlogEngagementRail
            postId={blog.id}
            title={blog.title}
            reactionCount={blog._count.reactions}
            hasReacted={hasReacted}
            isBookmarked={isBookmarked}
            commentCount={blog._count.comments}
            signedIn={!!viewerId}
          />
        </div>

        <div className="prose-wrapper">
          <MarkdownRenderer content={blog.content} />
        </div>

        {/* Closing "did you enjoy this?" CTA */}
        <div className="mt-16 py-10 border-t border-b border-border text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-4">
            Enjoyed this read?
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <ReactionBar
              postId={blog.id}
              initialCount={blog._count.reactions}
              initialReacted={hasReacted}
              signedIn={!!viewerId}
            />
            <BookmarkButton
              postId={blog.id}
              initialBookmarked={isBookmarked}
              signedIn={!!viewerId}
            />
            <ShareButton title={blog.title} />
          </div>
        </div>

        {/* Big author footer */}
        <AuthorFooterCard
          user={blog.user}
          morePosts={morePosts}
          isFollowing={isFollowing}
          signedIn={!!viewerId}
          viewerIsAuthor={isAuthor}
        />

        {/* Comments anchor */}
        <div id="comments">
          <CommentSection
            postId={blog.id}
            initialComments={commentsList}
            signedIn={!!viewerId}
            currentUserId={viewerId}
            isAdmin={viewerIsAdmin}
          />
        </div>

        <RelatedPosts posts={related} />
      </div>

      {/* MOBILE bottom-sticky action bar */}
      <div className="lg:hidden sticky bottom-3 z-30 mx-auto w-full max-w-3xl px-4 mt-6">
        <div className="rounded-2xl border border-border bg-surface/95 backdrop-blur-md p-2 shadow-2xl flex items-center justify-around gap-2">
          <ReactionBar
            postId={blog.id}
            initialCount={blog._count.reactions}
            initialReacted={hasReacted}
            signedIn={!!viewerId}
          />
          <BookmarkButton
            postId={blog.id}
            initialBookmarked={isBookmarked}
            signedIn={!!viewerId}
          />
          <a
            href="#comments"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface hover:bg-elevated text-fg/70 hover:text-fg transition"
            title="Jump to comments"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-bold tabular-nums">
              {blog._count.comments}
            </span>
          </a>
          <ShareButton title={blog.title} />
        </div>
      </div>
    </article>
  );
}
