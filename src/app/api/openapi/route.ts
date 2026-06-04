import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { openapiYaml } from "@/lib/openapi-spec";

// Admin-gated: the spec maps the full admin/internal surface, so it is not
// served publicly. The Swagger UI page (/api-docs) fetches this with the
// admin's session cookie.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return new NextResponse(openapiYaml, {
    status: 200,
    headers: {
      "content-type": "application/yaml; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
