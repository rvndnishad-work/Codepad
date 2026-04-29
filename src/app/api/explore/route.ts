import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const PAGE_SIZE = 20;

export async function GET(req: Request) {
  const rl = rateLimit(clientKey(req), 120, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate limited" }, { status: 429 });

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const template = url.searchParams.get("template");

  const items = await prisma.snippet.findMany({
    where: {
      visibility: "public",
      ...(template ? { template } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      slug: true,
      title: true,
      template: true,
      updatedAt: true,
      tags: true,
      user: { select: { name: true, image: true } },
    },
  });

  const hasMore = items.length > PAGE_SIZE;
  const page = hasMore ? items.slice(0, PAGE_SIZE) : items;

  return NextResponse.json({
    items: page.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      template: s.template,
      updatedAt: s.updatedAt.toISOString(),
      tags: parseTags(s.tags),
      author: s.user
        ? { name: s.user.name, image: s.user.image }
        : null,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
}

function parseTags(raw: string | null): string[] {
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
