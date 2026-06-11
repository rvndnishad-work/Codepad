import AdminUsersList from "./AdminUsersList";
import { requireAdminAccess } from "@/lib/permissions/staff";

interface AdminUsersPageProps {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}

// /admin/users is the Candidate persona's user page. Recruiters live at
// /admin/users/recruiters and are reached via the Recruiter sidebar.
export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await requireAdminAccess("user:manage");
  const params = await searchParams;
  return (
    <AdminUsersList
      userTypeFilter="candidate"
      baseUrl="/admin/users"
      searchParams={params}
    />
  );
}
