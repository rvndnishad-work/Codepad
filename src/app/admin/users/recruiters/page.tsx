import AdminUsersList from "../AdminUsersList";

interface AdminRecruitersPageProps {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}

export default async function AdminRecruitersPage({ searchParams }: AdminRecruitersPageProps) {
  const params = await searchParams;
  return (
    <AdminUsersList
      userTypeFilter="recruiter"
      baseUrl="/admin/users/recruiters"
      searchParams={params}
    />
  );
}
