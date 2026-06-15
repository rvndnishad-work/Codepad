import { requireAdminAccess } from "@/lib/permissions/staff";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BulkImport from "./BulkImport";

export const metadata = { title: "Bulk import — Admin", robots: { index: false } };

export default async function ImportPage() {
  await requireAdminAccess("content:curate");
  return (
    <div className="space-y-6">
      <Link href="/admin/interview-questions" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-fg">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Bulk import questions</h1>
        <p className="text-sm text-muted mt-1">Upload a JSON array or CSV. Companies are matched by name or slug.</p>
      </div>
      <BulkImport />
    </div>
  );
}
