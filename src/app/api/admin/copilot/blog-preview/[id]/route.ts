import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";

/**
 * Fetches a blog post + a heuristic "Gemma compliance audit" payload so the
 * Copilot UI can render the original post next to the AI findings side by
 * side. The audit is intentionally rule-based (no LLM round-trip on every
 * modal open) — Gemma's qualitative summary lives in the existing alert
 * body; this endpoint surfaces the structured signals an admin needs to
 * decide approve vs. reject at a glance.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
  }

  const content = post.content || "";
  const lower = content.toLowerCase();
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  // Cheap rule-based compliance signals — these are what Gemma flags on too,
  // but materializing them client-side keeps the modal snappy.
  const externalLinks = Array.from(content.matchAll(/https?:\/\/([^\s)\]"']+)/gi)).map(
    (m) => m[0]
  );
  const affiliateHints = externalLinks.filter((u) =>
    /(\?|&)(ref|aff|partner|utm_source|sponsor)=/i.test(u)
  );
  const promoTerms = [
    "buy now", "discount code", "use my link", "sign up here",
    "limited time", "click here", "free trial", "referral",
  ].filter((term) => lower.includes(term));
  const hasCoverImage = !!post.coverImage;
  const imageCount = (content.match(/!\[[^\]]*\]\([^)]+\)/g) ?? []).length;
  const codeBlockCount = (content.match(/```[\s\S]*?```/g) ?? []).length;

  const findings: { severity: "info" | "warn" | "block"; label: string; detail: string }[] = [];
  if (wordCount < 200) {
    findings.push({
      severity: "warn",
      label: "Thin content",
      detail: `Post is ${wordCount} words. Most published posts on this platform exceed 400.`,
    });
  }
  if (affiliateHints.length > 0) {
    findings.push({
      severity: "block",
      label: `${affiliateHints.length} affiliate-style link(s)`,
      detail: "Promotional tracking params detected. Verify disclosure & policy compliance.",
    });
  }
  if (promoTerms.length > 0) {
    findings.push({
      severity: "warn",
      label: `Promotional language (${promoTerms.length})`,
      detail: `Detected phrases: ${promoTerms.join(", ")}`,
    });
  }
  if (!hasCoverImage) {
    findings.push({
      severity: "info",
      label: "No cover image",
      detail: "Featured listings expect a cover image. Optional but recommended.",
    });
  }
  if (externalLinks.length > 8) {
    findings.push({
      severity: "warn",
      label: `${externalLinks.length} outbound links`,
      detail: "Heavy outbound link density. Review for link-farming patterns.",
    });
  }
  if (findings.length === 0) {
    findings.push({
      severity: "info",
      label: "No automated flags",
      detail: "Heuristic scan found no blocking issues — read for tone & substance before approving.",
    });
  }

  return NextResponse.json({
    post: {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      coverImage: post.coverImage,
      tags: post.tags,
      status: post.status,
      adminNotes: post.adminNotes,
      createdAt: post.createdAt.toISOString(),
      author: post.user
        ? {
            id: post.user.id,
            name: post.user.name,
            email: post.user.email,
            joined: post.user.createdAt.toISOString(),
          }
        : null,
    },
    audit: {
      wordCount,
      externalLinks,
      affiliateHints,
      promoTerms,
      imageCount,
      codeBlockCount,
      findings,
    },
  });
}
