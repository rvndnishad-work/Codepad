import AdminUsersList from "./AdminUsersList";

interface AdminUsersPageProps {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}

// /admin/users is the Candidate persona's user page. Recruiters live at
// /admin/users/recruiters and are reached via the Recruiter sidebar.
export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const params = await searchParams;
  return (
    <AdminUsersList
      userTypeFilter="candidate"
      baseUrl="/admin/users"
      searchParams={params}
    />
  );
}
