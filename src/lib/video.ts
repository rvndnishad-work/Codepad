// Parse common video-hosting URLs into embeddable iframe URLs. Returns null
// for unrecognised hosts so callers can fall back to a plain "Watch" link
// rather than trying to iframe something that won't load.

export type VideoEmbed = {
  kind: "youtube" | "vimeo" | "loom" | "other";
  embedUrl: string;
  /** Original URL — useful for rendering a "Open in new tab" fallback link. */
  originalUrl: string;
};

const YT_HOST = /^(?:www\.)?(?:youtube\.com|youtu\.be)$/i;
const VIMEO_HOST = /^(?:www\.)?vimeo\.com$/i;
const LOOM_HOST = /^(?:www\.)?loom\.com$/i;

export function parseVideoUrl(raw: string | null | undefined): VideoEmbed | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  // ── YouTube ──────────────────────────────────────────────────────────
  // Forms we accept:
  //   youtu.be/<id>
  //   youtube.com/watch?v=<id>
  //   youtube.com/embed/<id>
  //   youtube.com/shorts/<id>
  if (YT_HOST.test(url.hostname)) {
    let videoId: string | null = null;
    if (url.hostname.endsWith("youtu.be")) {
      videoId = url.pathname.slice(1).split("/")[0] || null;
    } else if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else if (url.pathname.startsWith("/embed/")) {
      videoId = url.pathname.slice("/embed/".length).split("/")[0] || null;
    } else if (url.pathname.startsWith("/shorts/")) {
      videoId = url.pathname.slice("/shorts/".length).split("/")[0] || null;
    }
    if (videoId) {
      // rel=0 reduces "more videos like this" overlay; modestbranding=1 is
      // deprecated but harmless. Origin param helps with some embed-policy
      // edge cases on production.
      return {
        kind: "youtube",
        embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?rel=0`,
        originalUrl: trimmed,
      };
    }
  }

  // ── Vimeo ────────────────────────────────────────────────────────────
  //   vimeo.com/<id>
  //   vimeo.com/channels/<channel>/<id>
  if (VIMEO_HOST.test(url.hostname)) {
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && /^\d+$/.test(last)) {
      return {
        kind: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${last}`,
        originalUrl: trimmed,
      };
    }
  }

  // ── Loom ─────────────────────────────────────────────────────────────
  //   loom.com/share/<id>
  if (LOOM_HOST.test(url.hostname) && url.pathname.startsWith("/share/")) {
    const id = url.pathname.slice("/share/".length).split("/")[0];
    if (id) {
      return {
        kind: "loom",
        embedUrl: `https://www.loom.com/embed/${encodeURIComponent(id)}`,
        originalUrl: trimmed,
      };
    }
  }

  // Anything else — caller can render as a plain link.
  return { kind: "other", embedUrl: trimmed, originalUrl: trimmed };
}
