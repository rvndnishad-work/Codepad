/**
 * Download an "export everything" zip (Settings > Data and privacy). The
 * link from the email works for 7 days, only for owners and admins of the
 * workspace who are signed in. The zip is built when it is opened, so it
 * holds the latest data. Keyed by export id rather than the workspace web
 * address, so the link survives an address change.
 */
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settingsAccess } from "@/lib/workspace/settings-server";
import { buildWorkspaceExport } from "@/lib/workspace/data-privacy-server";

export const maxDuration = 60;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    const next = `/api/workspace-exports/${id}`;
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, req.url));
  }

  const row = await prisma.workspaceExport.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      workspace: { select: { id: true, slug: true, members: { where: { userId: session.user.id }, select: { role: true, permissions: true } } } },
    },
  });
  const me = row?.workspace.members[0];
  if (!row || !me) return NextResponse.json({ error: "Export not found." }, { status: 404 });
  const access = await settingsAccess(me);
  if (!access.canEdit) return NextResponse.json({ error: "Only owners and admins can download exports." }, { status: 403 });
  if (row.status !== "READY") return NextResponse.json({ error: "This export is not ready." }, { status: 409 });
  if (!row.expiresAt || row.expiresAt.getTime() <= Date.now()) {
    await prisma.workspaceExport.update({ where: { id: row.id }, data: { status: "EXPIRED" } }).catch(() => null);
    return NextResponse.json({ error: "This link has expired. Start a new export in Settings, Data and privacy." }, { status: 410 });
  }

  const { zip } = await buildWorkspaceExport(row.workspace.id);
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${row.workspace.slug}-export-${day}.zip"`,
      "cache-control": "private, no-store",
    },
  });
}
