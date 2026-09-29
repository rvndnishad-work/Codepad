/**
 * Cloudflare R2 (S3 compatible) access for the recordings bucket.
 *
 * Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
 * The bucket stays private: reads go through short-lived signed links.
 *
 * Server only.
 */
import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** https://<account>.r2.cloudflarestorage.com */
  endpoint: string;
};

/** The bucket settings, or null when any variable is missing. */
export function r2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint: `https://${accountId}.r2.cloudflarestorage.com` };
}

let cached: { key: string; client: S3Client } | null = null;

export function r2Client(cfg: R2Config): S3Client {
  const key = `${cfg.endpoint}|${cfg.accessKeyId}`;
  if (cached?.key === key) return cached.client;
  const client = new S3Client({
    region: "auto",
    endpoint: cfg.endpoint,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
  cached = { key, client };
  return client;
}

export async function putObject(cfg: R2Config, key: string, body: Uint8Array, contentType: string): Promise<void> {
  await r2Client(cfg).send(new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: body, ContentType: contentType }));
}

/**
 * A signed GET link valid for `seconds` (default 10 minutes). With
 * `downloadName`, the browser saves the file under that name.
 */
export async function signedGetUrl(
  cfg: R2Config,
  key: string,
  { seconds = 600, downloadName, contentType }: { seconds?: number; downloadName?: string; contentType?: string } = {},
): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    ResponseContentDisposition: downloadName ? `attachment; filename="${downloadName.replace(/"/g, "")}"` : undefined,
    ResponseContentType: contentType,
  });
  return getSignedUrl(r2Client(cfg), cmd, { expiresIn: seconds });
}

/** A signed PUT link, for uploads straight from the browser. */
export async function signedPutUrl(cfg: R2Config, key: string, contentType: string, seconds = 600): Promise<string> {
  const cmd = new PutObjectCommand({ Bucket: cfg.bucket, Key: key, ContentType: contentType });
  return getSignedUrl(r2Client(cfg), cmd, { expiresIn: seconds });
}

/** Deletes keys in batches of 1000. Missing keys count as deleted. */
export async function deleteObjects(cfg: R2Config, keys: string[]): Promise<void> {
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    if (!batch.length) continue;
    const res = await r2Client(cfg).send(
      new DeleteObjectsCommand({ Bucket: cfg.bucket, Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true } }),
    );
    if (res.Errors?.length) {
      throw new Error(`R2 delete failed for ${res.Errors.length} object(s): ${res.Errors[0]?.Message ?? "unknown"}`);
    }
  }
}
