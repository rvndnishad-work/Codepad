/**
 * A workspace's uploaded logo (Settings > General). Public on purpose: the
 * logo shows on candidate pages and in candidate emails, where nobody is
 * signed in. Only raster images are stored (checked by their bytes on
 * upload), and the response forbids sniffing and scripts all the same.
 */
import { prisma } from "@/lib/prisma";
import { isUploadedLogoUrl } from "@/lib/workspace/screening-defaults";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspaceId = String(id).slice(0, 40);
  const row = await prisma.workspaceLogo.findUnique({
    where: { workspaceId },
    select: { mime: true, bytes: true, updatedAt: true, workspace: { select: { logoUrl: true } } },
  });
  // A logo that was replaced by a pasted address or removed is not served.
  if (!row || !isUploadedLogoUrl(row.workspace.logoUrl, workspaceId)) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const versioned = new URL(req.url).searchParams.has("v");
  return new Response(new Uint8Array(row.bytes), {
    headers: {
      "Content-Type": row.mime,
      "Content-Length": String(row.bytes.length),
      "Last-Modified": row.updatedAt.toUTCString(),
      // Each upload gets a new ?v=, so a versioned address never changes.
      "Cache-Control": versioned ? "public, max-age=31536000, immutable" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });
}
