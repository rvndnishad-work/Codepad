import AdminUsersList from "../AdminUsersList";
import { requireAdminAccess } from "@/lib/permissions/staff";

interface AdminRecruitersPageProps {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}

export default async function AdminRecruitersPage({ searchParams }: AdminRecruitersPageProps) {
  await requireAdminAccess("user:manage");
  const params = await searchParams;
  return (
    <AdminUsersList
      userTypeFilter="recruiter"
      baseUrl="/admin/users/recruiters"
      searchParams={params}
    />
  );
}
