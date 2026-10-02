import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * The five things people can report, and what hide / delete mean for each.
 * Used by the reports queue, the comments tab and the Trends page so every
 * path changes content the same way.
 */
export const TARGET_TYPES = ["blog_comment", "question_comment", "blog", "snippet", "experience"] as const;
export type TargetType = (typeof TARGET_TYPES)[number];
export const isTargetType = (s: unknown): s is TargetType => typeof s === "string" && (TARGET_TYPES as readonly string[]).includes(s);

export const TARGET_LABEL: Record<TargetType, string> = {
  blog_comment: "Blog comment",
  question_comment: "Question comment",
  blog: "Blog post",
  snippet: "Snippet",
  experience: "Experience",
};

/** Comments have no hidden flag in the schema, so for them hide is not offered. */
export const CAN_HIDE: Record<TargetType, boolean> = {
  blog_comment: false,
  question_comment: false,
  blog: true,
  snippet: true,
  experience: true,
};

export type TargetPreview = {
  exists: boolean;
  title: string;
  text: string | null;
  authorId: string | null;
  authorName: string | null;
  href: string | null;
  /** Already off the site (private snippet, unpublished post…). */
  hidden: boolean;
};

const key = (type: string, id: string) => `${type}:${id}`;
const clip = (s: string | null | undefined, n = 280) => (s ? (s.length > n ? `${s.slice(0, n)}…` : s) : null);

/** One query per target type, whatever the number of refs. */
export async function loadTargets(refs: { targetType: string; targetId: string }[]): Promise<Map<string, TargetPreview>> {
  const ids = (t: TargetType) => [...new Set(refs.filter((r) => r.targetType === t).map((r) => r.targetId))];
  const user = { select: { id: true, name: true, email: true } } as const;
  const [bc, qc, blogs, snippets, exps] = await Promise.all([
    ids("blog_comment").length
      ? prisma.blogComment.findMany({ where: { id: { in: ids("blog_comment") } }, select: { id: true, content: true, user, post: { select: { slug: true, title: true } } } })
      : [],
    ids("question_comment").length
      ? prisma.prepQuestionComment.findMany({ where: { id: { in: ids("question_comment") } }, select: { id: true, content: true, user, question: { select: { slug: true, title: true } } } })
      : [],
    ids("blog").length
      ? prisma.blogPost.findMany({ where: { id: { in: ids("blog") } }, select: { id: true, title: true, slug: true, excerpt: true, published: true, user } })
      : [],
    ids("snippet").length
      ? prisma.snippet.findMany({ where: { id: { in: ids("snippet") } }, select: { id: true, title: true, slug: true, visibility: true, user } })
      : [],
    ids("experience").length
      ? prisma.prepExperience.findMany({ where: { id: { in: ids("experience") } }, select: { id: true, companyName: true, role: true, process: true, status: true, authorId: true } })
      : [],
  ]);

  const out = new Map<string, TargetPreview>();
  for (const c of bc)
    out.set(key("blog_comment", c.id), { exists: true, title: `On "${c.post.title}"`, text: clip(c.content), authorId: c.user.id, authorName: c.user.name ?? c.user.email, href: `/blog/${c.post.slug}`, hidden: false });
  for (const c of qc)
    out.set(key("question_comment", c.id), { exists: true, title: `On "${c.question.title}"`, text: clip(c.content), authorId: c.user.id, authorName: c.user.name ?? c.user.email, href: `/interview-question/${c.question.slug}`, hidden: false });
  for (const b of blogs)
    out.set(key("blog", b.id), { exists: true, title: b.title, text: clip(b.excerpt), authorId: b.user.id, authorName: b.user.name ?? b.user.email, href: `/blog/${b.slug}`, hidden: !b.published });
  for (const s of snippets)
    out.set(key("snippet", s.id), { exists: true, title: s.title, text: null, authorId: s.user?.id ?? null, authorName: s.user?.name ?? s.user?.email ?? null, href: `/play/${s.slug}`, hidden: s.visibility !== "public" });
  for (const e of exps)
    out.set(key("experience", e.id), { exists: true, title: [e.companyName, e.role].filter(Boolean).join(" · ") || "Interview experience", text: clip(e.process), authorId: e.authorId, authorName: null, href: null, hidden: e.status !== "published" });
  return out;
}

export function previewFor(map: Map<string, TargetPreview>, type: string, id: string): TargetPreview {
  return map.get(key(type, id)) ?? { exists: false, title: "Already removed", text: null, authorId: null, authorName: null, href: null, hidden: true };
}

/** Take the target off the site without deleting it. Returns false when the type cannot be hidden. */
export async function hideTarget(type: TargetType, id: string): Promise<boolean> {
  switch (type) {
    case "snippet":
      await prisma.snippet.update({ where: { id }, data: { visibility: "private", pinned: false } });
      return true;
    case "blog":
      await prisma.blogPost.update({ where: { id }, data: { published: false, status: "PENDING", scheduledAt: null } });
      return true;
    case "experience":
      await prisma.prepExperience.update({ where: { id }, data: { status: "pending" } });
      return true;
    default:
      return false;
  }
}

/** Delete the target. Missing rows are fine (already gone). */
export async function deleteTarget(type: TargetType, id: string): Promise<void> {
  const where = { where: { id: { in: [id] } } };
  switch (type) {
    case "blog_comment":
      await prisma.blogComment.deleteMany(where);
      break;
    case "question_comment":
      await prisma.prepQuestionComment.deleteMany(where);
      break;
    case "blog":
      await prisma.blogPost.deleteMany(where);
      break;
    case "snippet":
      await prisma.snippet.deleteMany(where);
      break;
    case "experience":
      await prisma.prepExperience.deleteMany(where);
      break;
  }
}
