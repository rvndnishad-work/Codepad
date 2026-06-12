import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { notFound } from "next/navigation";
import SwaggerView from "./SwaggerView";

// Interactive API reference (Swagger UI) for the Interviewpad API.
// Admin-only: non-admins get a 404 so the surface isn't discoverable.
export const dynamic = "force-dynamic";
export const metadata = { title: "API Docs — Interviewpad" };

export default async function ApiDocsPage() {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) notFound();
  return <SwaggerView />;
}
