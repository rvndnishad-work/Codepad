import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "Creator Space on Interviewpad";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic share card for /c/[handle] — creators share these links on
 * YouTube/LinkedIn, so the preview has to sell the space. Text-only by design:
 * avatars can be data-URLs (too large to inline) or arbitrary remote hosts.
 */
export default async function OgImage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const space = await prisma.creatorSpace.findUnique({
    where: { handle },
    select: { id: true, name: true, tagline: true, topics: true, published: true },
  });

  const name = space?.published ? space.name : "Creator Space";
  const tagline = space?.published ? space.tagline : null;
  const topics = space?.published ? space.topics.slice(0, 4) : [];

  const [followers, resources] = space?.published
    ? await Promise.all([
        prisma.spaceFollow.count({ where: { spaceId: space.id } }),
        prisma.spaceContent.count({ where: { spaceId: space.id } }),
      ])
    : [0, 0];

  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0a0a0b",
          backgroundImage: "radial-gradient(circle at 85% 15%, rgba(250,204,21,0.16), transparent 45%)",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              padding: "6px 16px",
              borderRadius: 999,
              border: "1px solid rgba(250,204,21,0.35)",
              color: "#facc15",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 3,
            }}
          >
            CREATOR SPACE
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 150,
              height: 150,
              borderRadius: 36,
              backgroundColor: "rgba(250,204,21,0.12)",
              border: "2px solid rgba(250,204,21,0.4)",
              color: "#facc15",
              fontSize: 60,
              fontWeight: 800,
            }}
          >
            {initials}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: 68, fontWeight: 800, color: "#fafafa", lineHeight: 1.1 }}>
              {name}
            </div>
            {tagline && (
              <div style={{ display: "flex", fontSize: 30, color: "#a1a1aa", marginTop: 16, lineHeight: 1.35 }}>
                {tagline.slice(0, 90)}
              </div>
            )}
            {topics.length > 0 && (
              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                {topics.map((t) => (
                  <div
                    key={t}
                    style={{
                      display: "flex",
                      padding: "6px 18px",
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#d4d4d8",
                      fontSize: 22,
                      fontWeight: 600,
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 36, color: "#a1a1aa", fontSize: 26 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ color: "#fafafa", fontWeight: 800 }}>{followers.toLocaleString()}</span> followers
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <span style={{ color: "#fafafa", fontWeight: 800 }}>{resources}</span> resources
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: "#fafafa" }}>
            interview<span style={{ color: "#facc15" }}>pad</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
