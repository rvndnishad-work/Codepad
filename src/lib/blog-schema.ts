import { z } from "zod";

export const TAG_RE = /^[a-z0-9][a-z0-9-]{0,29}$/;

// 8 MB cap on base64 data URLs — covers reasonable cover images (a 16:9 PNG
// from Gemini at 1280×720 is usually 200–600 KB base64) while preventing
// the BlogPost.coverImage column from ballooning.
const MAX_DATA_URL_BYTES = 8 * 1024 * 1024;

const DATA_URL_IMAGE_RE = /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/;
const HTTP_URL_RE = /^https?:\/\//i;

/**
 * Cover image accepts either an http(s) URL (CDN-hosted) or a base64
 * image data URL (e.g. straight from the Gemini image generator).
 * Both forms are size-limited so the DB column doesn't explode.
 */
export const coverImageSchema = z
  .string()
  .max(MAX_DATA_URL_BYTES, "cover image too large (max 8MB)")
  .refine(
    (s) => s === "" || HTTP_URL_RE.test(s) || DATA_URL_IMAGE_RE.test(s),
    "cover must be an http(s) URL or a base64 image data URL",
  );

export const blogTagsSchema = z.array(z.string().regex(TAG_RE)).max(8);
